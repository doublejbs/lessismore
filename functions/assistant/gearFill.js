import {HttpsError} from "firebase-functions/v2/https";
import {
  GEAR_FILL_FINAL_CALL_TEXT,
  GEAR_FILL_INSTRUCTION,
  GEAR_FILL_NUDGE,
  GEAR_FILL_PROMPT,
  GEAR_FILL_RETRY_ERROR,
} from "./prompt.js";
import {
  ESSENTIAL_GROUPS,
  GEAR_FILL_READ_TOOL_NAMES,
  GEAR_FILL_TOOL_DECLARATIONS,
  PROPOSE_GEAR_TOOL,
  createReadTools,
} from "./tools.js";
import {
  UsageKind,
  assertUsageAvailable,
  consumeDailyUsage,
} from "./usage.js";
import {buildFirstTurnPrefix, runTurn} from "./engine.js";
import {
  PAST_TRIPS_READ_LIMIT,
  buildGearFillBlocks,
  buildWarehouseEntries,
  selectPastTrips,
} from "./pastTrips.js";

// 모드 호출 gear_fill(장비 자동 채우기) — 앱 레포 specs/Assistant.md
// AS-1(개정)·AS-4·AS-6·AS-9·AS-10·AS-12·AS-13(2026-10-31 개정).
// 대화 기록 없이 요청마다 독립: 여행 현황·창고·지난 여행 선주입 → (필요 시 읽기)
// → propose_gear → 검증 → result. 후보는 사용자 창고 장비뿐이다.

export const MODE_GEAR_FILL = "gear_fill";

const LOCALES = ["ko", "en", "ja"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_MODEL_CALLS = 8;
// 40개 결과를 담을 출력 상한(Anthropic — Gemini는 이미 8192). 대화 경로는 기본값.
const GEAR_FILL_MAX_TOKENS = 8192;
// 지난 여행 조회 시간 상한 — 넘기면 블록 없이 진행한다.
const PAST_TRIPS_TIMEOUT_MS = 4000;
const MAX_ITEMS = 40;
const MAX_HEADLINE = 60;
const MAX_REASON = 40;
const MAX_NOTES = 3;
const MAX_NOTE_LENGTH = 80;
const PRIORITIES = ["essential", "recommended"];
// 그룹당 1개로 자르는 필수 4종 그룹. 의류·조리 같은 그룹은 여러 개가 함께 갈 수
// 있어 자르지 않는다(역할 중복 제거는 프롬프트 몫 — AS-6·AS-13).
const SINGLE_PER_GROUP = new Set(ESSENTIAL_GROUPS);
const SNOW_SKIES = new Set(["눈", "소낙눈"]);
const SHELTER_KEYWORD = "대피소";
// 여행지가 없을 때 headline 앞에 반드시 오는 안내(사용자 언어).
const NO_LOCATION_HEADLINES = {
  ko: "여행지를 정하면 날씨에 맞춰 골라 드려요",
  en: "Pick a destination and I'll match the weather",
  ja: "目的地を決めると天気に合わせて選びます",
};
const TRAILING_PERIOD_RE = /[.。]+$/;
// headline이 비었을 때 쓰는 사용자 언어 기본 문구.
const DEFAULT_HEADLINES = {
  ko: "이 여행에 맞춰 골랐어요",
  en: "Picked for this trip",
  ja: "この旅行に合わせて選びました",
};

const WEATHER_LABELS = {
  ko: {low: "최저", rain: "비", snow: "눈", gust: "돌풍"},
  en: {low: "Low", rain: "Rain", snow: "Snow", gust: "Gusts"},
  ja: {low: "最低", rain: "雨", snow: "雪", gust: "突風"},
};

const invalid = (message) => new HttpsError("invalid-argument", message);

const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const isValidDate = (s) => typeof s === "string" && DATE_RE.test(s) &&
  !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) &&
  new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);

/**
 * 모드 호출 요청을 검증한다(사용량을 세기 전).
 * @param {object} data request.data
 * @return {{bagId: string, locale: string, today: string}}
 */
export const validateModeRequest = (data) => {
  if (!isPlainObject(data) || data.mode !== MODE_GEAR_FILL) {
    throw invalid("mode 값이 올바르지 않습니다.");
  }

  const bagId = data.context?.bagId;

  if (typeof bagId !== "string" || bagId.length === 0 ||
    bagId.length > 128 || bagId.includes("/")) {
    throw invalid("context.bagId 값이 올바르지 않습니다.");
  }

  if (!LOCALES.includes(data.locale)) {
    throw invalid("locale 값이 올바르지 않습니다.");
  }

  if (!isValidDate(data.today)) {
    throw invalid("today는 YYYY-MM-DD여야 합니다.");
  }

  return {bagId, locale: data.locale, today: data.today};
};

const formatMonthDay = (iso) =>
  `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;

const formatRange = (first, last) => {
  if (first === last) {
    return formatMonthDay(first);
  }

  return first.slice(5, 7) === last.slice(5, 7) ?
    `${formatMonthDay(first)}~${Number(last.slice(8, 10))}` :
    `${formatMonthDay(first)}~${formatMonthDay(last)}`;
};

const finiteValues = (list, key) =>
  list.map((d) => d[key]).filter((v) => typeof v === "number" &&
    Number.isFinite(v));

/**
 * 일별 날씨(bag.weather.daily 요약 또는 get_forecast 결과)로 시트 상단 날씨 한 줄을
 * 만든다. 예: "11/7~8 최저 -8° · 비 90% · 돌풍 15m/s".
 * 여행 기간 안 날짜만 쓴다 — 하나도 없으면(다른 날짜 캐시뿐이면) null.
 */
export const buildWeatherLine = (snapshot, locale) => {
  const all = Array.isArray(snapshot?.weather) ? snapshot.weather : [];
  const {startDate, endDate} = snapshot ?? {};
  const days = all
      .filter((d) => typeof d?.date === "string" && startDate && endDate &&
        d.date >= startDate && d.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));

  if (days.length === 0) {
    return null;
  }

  const labels = WEATHER_LABELS[locale] ?? WEATHER_LABELS.ko;
  const parts = [formatRange(days[0].date, days[days.length - 1].date)];
  const lows = finiteValues(days, "tempMin");
  const precips = finiteValues(days, "precipProb");
  const gusts = finiteValues(days, "windGustMax");

  if (lows.length > 0) {
    parts[0] += ` ${labels.low} ${Math.round(Math.min(...lows))}°`;
  }

  if (precips.length > 0) {
    const snowy = days.some((d) => SNOW_SKIES.has(d.sky));

    parts.push(`${snowy ? labels.snow : labels.rain} ` +
      `${Math.round(Math.max(...precips))}%`);
  }

  if (gusts.length > 0) {
    parts.push(`${labels.gust} ${Math.round(Math.max(...gusts))}m/s`);
  }

  return parts.join(" · ");
};

const clip = (value, max) => String(value ?? "").trim().slice(0, max);

/**
 * headline을 정리한다. 여행지가 없으면 안내 문구로 시작하게 하고(모델이 빠뜨려도),
 * 60자 상한은 안내 문구 뒤 본문에만 적용한다. 비면 기본 문구.
 */
const buildHeadline = (raw, locale, hasLocation) => {
  const text = String(raw ?? "").trim();

  if (!hasLocation) {
    const prefix = NO_LOCATION_HEADLINES[locale] ?? NO_LOCATION_HEADLINES.ko;
    const body = clip(text.replace(prefix, "").replace(/^[\s.。,·—-]+/, ""),
        MAX_HEADLINE);

    return body ? `${prefix} · ${body}` : prefix;
  }

  return clip(text, MAX_HEADLINE) ||
    (DEFAULT_HEADLINES[locale] ?? DEFAULT_HEADLINES.ko);
};

/**
 * propose_gear 입력을 검증한다(AS-13).
 * - 이 턴에 서버가 선주입했거나 list_warehouse로 읽은 창고 gearId만 통과,
 *   이름·브랜드·무게·그룹은 창고 값으로 덮어쓰고 출처는 항상 warehouse.
 * - 이미 담긴 id·중복 id 제외, essential 먼저 정렬 후 필수 그룹은 1개씩,
 *   40개로 자른다. 버린 개수는 dropped로만 센다.
 * - presetGroups: 이미 채워진 필수 그룹(여행에 담긴 것·대피소 박의 tent).
 */
export const validateProposal = ({
  input,
  seenGear,
  tripGearIds,
  presetGroups = [],
  locale = "ko",
  hasLocation = true,
}) => {
  const rawItems = Array.isArray(input?.items) ? input.items : [];
  const usedIds = new Set();
  const candidates = [];

  for (const raw of rawItems) {
    const seen = isPlainObject(raw) ? seenGear.get(raw.gearId) : undefined;

    if (!seen || tripGearIds.has(raw.gearId) || usedIds.has(raw.gearId)) {
      continue;
    }

    usedIds.add(raw.gearId);
    candidates.push({
      gearId: raw.gearId,
      source: "warehouse",
      name: seen.name,
      brand: seen.brand,
      weightG: seen.weightG,
      group: seen.group,
      priority: PRIORITIES.includes(raw.priority) ?
        raw.priority :
        "recommended",
      // reason은 마침표 없는 구절 — 끝의 마침표를 떼고 40자로 자른다.
      reason: clip(String(raw.reason ?? "").trim()
          .replace(TRAILING_PERIOD_RE, ""), MAX_REASON),
    });
  }

  // 안정 정렬: essential 먼저, 같은 우선순위 안에서는 모델 순서 유지.
  candidates.sort((a, b) => PRIORITIES.indexOf(a.priority) -
    PRIORITIES.indexOf(b.priority));

  const takenGroups = new Set(presetGroups);
  const items = [];

  for (const item of candidates) {
    if (SINGLE_PER_GROUP.has(item.group)) {
      if (takenGroups.has(item.group)) {
        continue;
      }

      takenGroups.add(item.group);
    }

    if (items.length < MAX_ITEMS) {
      items.push(item);
    }
  }

  const notes = (Array.isArray(input?.notes) ? input.notes : [])
      .filter((n) => typeof n === "string" && n.trim().length > 0)
      .slice(0, MAX_NOTES)
      .map((n) => clip(n, MAX_NOTE_LENGTH));

  return {
    headline: buildHeadline(input?.headline, locale, hasLocation),
    rawCount: rawItems.length,
    items,
    notes,
    dropped: rawItems.length - items.length,
  };
};

/**
 * 고를 수 있는 창고 장비를 모은다(id → 창고 값). 선주입한 [창고]와 이 턴의
 * list_warehouse 결과만 넣는다 — 그 밖의 id는 검증에서 버려진다.
 * @param {Map<string, object>} seenGear
 * @param {object[]} gears 창고 요약({id, name, brand, weight, group})
 */
export const rememberWarehouseGear = (seenGear, gears) => {
  for (const g of Array.isArray(gears) ? gears : []) {
    if (!g?.id || seenGear.has(g.id)) {
      continue;
    }

    seenGear.set(g.id, {
      name: g.name ?? "",
      brand: g.brand ?? "",
      weightG: Number.isFinite(g.weight) ? g.weight : 0,
      group: g.group ?? "etc",
    });
  }
};

const isShelterTrip = (location) => Boolean(location?.campSpotId) &&
  String(location?.name ?? "").includes(SHELTER_KEYWORD);

/**
 * 창고에 없는 필수 그룹(AS-13 missingGroups): 필수 4종 중 사용자 창고 전체
 * (담긴 것 포함)와 이 배낭에 그 그룹 장비가 하나도 없는 그룹. 대피소 박이면
 * tent 제외. 순서는 tent·sleeping_bag·mat·backpack.
 * @return {string[]}
 */
export const computeMissingGroups = ({warehouse, tripGears, location}) => {
  const owned = new Set([...(warehouse ?? []), ...(tripGears ?? [])]
      .map((g) => g?.group));
  const shelter = isShelterTrip(location);

  return ESSENTIAL_GROUPS.filter((group) => !owned.has(group) &&
    !(shelter && group === "tent"));
};

/**
 * 이미 채워진 필수 그룹: 여행에 담긴 장비의 필수 그룹 + 대피소 박이면 tent.
 * @param {object} tripSnapshot get_trip 결과
 * @return {string[]}
 */
export const presetEssentialGroups = (tripSnapshot) => {
  const groups = new Set((tripSnapshot.gears ?? [])
      .map((g) => g.group)
      .filter((g) => SINGLE_PER_GROUP.has(g)));

  if (isShelterTrip(tripSnapshot.location)) {
    groups.add("tent");
  }

  return [...groups];
};

/**
 * gear_fill 모드 호출을 처리한다. 오류는 HttpsError 또는 공급자 오류로 던진다.
 */
export const runGearFill = async ({
  data,
  uid,
  providerName,
  model,
  providerModule,
  apiKey,
  log,
  deadline,
  setStage,
}) => {
  const {bagId, locale, today} = validateModeRequest(data);

  if (!apiKey) {
    log({event: "api_key_missing", mode: MODE_GEAR_FILL});
    throw new HttpsError("internal", "문제가 생겼어요. 다시 시도해 주세요");
  }

  // 한도를 이미 다 쓴 사용자는 읽기 전에 거절한다(최종 판정은 consumeDailyUsage).
  setStage("usage");

  const remainingBefore = await assertUsageAvailable(uid);

  // 여행 현황(소유자 확인 포함 — not-found·permission-denied). 메모 본문은 뺀다(AS-10).
  setStage("trip");

  const readTools = createReadTools({uid, bagId, today});
  // 지난 여행은 창고·여행 현황과 병렬로 읽고, 실패하거나(권한·누락) 4초를 넘기면
  // 블록 없이 진행한다.
  let pastTimer = null;
  const pastTimeout = new Promise((resolve) => {
    pastTimer = setTimeout(() => {
      log({event: "past_trips_timeout", mode: MODE_GEAR_FILL,
        ms: PAST_TRIPS_TIMEOUT_MS});
      resolve([]);
    }, PAST_TRIPS_TIMEOUT_MS);
  });
  const pastBagsPromise = Promise.race([
    readTools.loadOwnBags(PAST_TRIPS_READ_LIMIT).catch((err) => {
      log({event: "past_trips_failed", mode: MODE_GEAR_FILL,
        errorName: err?.constructor?.name ?? err?.name ?? null});

      return [];
    }),
    pastTimeout,
  ]).finally(() => clearTimeout(pastTimer));
  const warehousePromise = readTools.warehouseGears();

  // 여행 현황이 먼저 실패하면(not-found 등) 기다리지 않는 창고 읽기의 거부를 삼킨다.
  warehousePromise.catch(() => {});

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 메모 제외
  const {memo, ...tripSnapshot} = await readTools.getTrip();
  const [tripGearIds, warehouse, pastBags] = await Promise.all([
    readTools.tripGearIds(),
    warehousePromise,
    pastBagsPromise,
  ]);
  const presetGroups = presetEssentialGroups(tripSnapshot);
  const missingGroups = computeMissingGroups({
    warehouse,
    tripGears: tripSnapshot.gears,
    location: tripSnapshot.location,
  });
  const available = warehouse.filter((g) => !tripGearIds.has(g.id));
  const trip = {
    name: tripSnapshot.name ?? "",
    startDate: tripSnapshot.startDate ?? "",
    endDate: tripSnapshot.endDate ?? "",
    locationName: tripSnapshot.location?.name || null,
    weatherLine: buildWeatherLine(tripSnapshot, locale),
  };

  // 고를 창고 장비가 없으면 모델을 부르지 않고 사용량도 세지 않는다(AS-4·§6).
  // warehouseEmpty는 창고 자체가 빈 경우만 true — 전부 이미 담긴 경우와 앱 문구가
  // 다르다(AS-15).
  if (available.length === 0) {
    log({event: "mode_result", mode: MODE_GEAR_FILL, items: 0, skipped: true,
      warehouse: warehouse.length, missing: missingGroups.length});

    return {
      mode: MODE_GEAR_FILL,
      provider: providerName,
      model,
      remaining: remainingBefore,
      result: {
        headline: "",
        items: [],
        notes: [],
        trip,
        missingGroups,
        warehouseEmpty: warehouse.length === 0,
      },
      refused: false,
    };
  }

  const warehouseIds = new Set(warehouse.map((g) => g.id));
  const {trips: pastTrips, tripCounts, total: pastTotal} = selectPastTrips({
    bags: pastBags,
    today,
    currentBagId: bagId,
    warehouseIds,
  });
  const {
    entries: warehouseEntries,
    truncated,
    truncatedByGroup,
  } = buildWarehouseEntries({
    available,
    tripCounts,
  });

  setStage("usage");

  const remaining = await consumeDailyUsage(uid, UsageKind.USER_TEXT);

  setStage("turn");

  const handlers = Object.fromEntries(Object.entries(readTools.handlers)
      .filter(([name]) => GEAR_FILL_READ_TOOL_NAMES.has(name)));
  // list_warehouse 재조회 결과에도 trips를 붙인다(선주입 [창고]와 같은 모양).
  const listWarehouse = handlers.list_warehouse;

  handlers.list_warehouse = async (input) => {
    const res = await listWarehouse(input);

    return {
      ...res,
      gears: res.gears.map((g) => ({...g, trips: tripCounts.get(g.id) ?? 0})),
    };
  };

  const seenGear = new Map();
  const injectedIds = new Set(warehouseEntries.map((e) => e.id));

  rememberWarehouseGear(seenGear,
      available.filter((g) => injectedIds.has(g.id)));
  // bag.weather가 없을 때 weatherLine 폴백으로 쓸, 이 턴의 get_forecast 예보.
  let forecastDaily = [];
  const history = [];
  const provider = providerModule.createProvider({
    apiKey,
    model,
    system: GEAR_FILL_PROMPT,
    tools: GEAR_FILL_TOOL_DECLARATIONS,
    webSearch: false,
    forceToolCall: true,
    maxTokens: GEAR_FILL_MAX_TOKENS,
    log,
    history,
  });
  const usage = {input: 0, output: 0, cacheRead: 0, cacheWrite: 0};
  let modelCalls = 0;
  let reads = 0;

  // 한 번의 runTurn(첫 요청 또는 재시도). 모델 호출 상한은 남은 몫만 준다.
  const runOnce = async (start) => {
    const turn = await runTurn({
      provider,
      readHandlers: handlers,
      ...start,
      log,
      deadline,
      isTerminalTool: (name) => name === PROPOSE_GEAR_TOOL,
      maxModelCalls: MAX_MODEL_CALLS - modelCalls,
      nudgeText: GEAR_FILL_NUDGE,
      finalCall: {tools: [PROPOSE_GEAR_TOOL], text: GEAR_FILL_FINAL_CALL_TEXT},
      onReadResult: (call, content) => {
        if (call.name === "list_warehouse") {
          rememberWarehouseGear(seenGear, content?.gears);
        }

        if (call.name === "get_forecast" && content?.available &&
          Array.isArray(content.daily)) {
          forecastDaily = [...forecastDaily, ...content.daily];
        }
      },
    });

    modelCalls += turn.modelCalls;
    reads += turn.readCount;
    usage.input += turn.usage.input;
    usage.output += turn.usage.output;
    usage.cacheRead += turn.usage.cacheRead;
    usage.cacheWrite += turn.usage.cacheWrite;

    return turn;
  };
  const base = {mode: MODE_GEAR_FILL, provider: providerName, model, remaining};
  const userText = buildFirstTurnPrefix({today, locale, tripSnapshot}) +
    buildGearFillBlocks({
      warehouseEntries,
      truncated,
      truncatedByGroup,
      trips: pastTrips,
    }) +
    GEAR_FILL_INSTRUCTION;
  let turn = await runOnce({userText});
  let checked = null;

  for (let attempt = 0; ; attempt += 1) {
    if (turn.stopReason === "refusal") {
      log({event: "mode_result", mode: MODE_GEAR_FILL, refused: true,
        modelCalls, reads, usage});

      return {...base, result: null, refused: true};
    }

    const proposal = turn.pendingActions
        .find((a) => a.name === PROPOSE_GEAR_TOOL);

    if (!proposal) {
      log({event: "mode_no_result", mode: MODE_GEAR_FILL,
        stopReason: turn.stopReason, modelCalls});
      throw new HttpsError("internal", "문제가 생겼어요. 다시 시도해 주세요");
    }

    checked = validateProposal({
      input: proposal.input,
      seenGear,
      tripGearIds,
      presetGroups,
      locale,
      hasLocation: Boolean(tripSnapshot.location),
    });

    // 제출 항목이 있었는데 전부 버려졌으면(지어낸 id 등) 오류 결과를 주고
    // 모델 호출 상한 안에서 한 번만 다시 받는다.
    const allDropped = checked.rawCount > 0 && checked.items.length === 0;

    if (!allDropped) {
      break;
    }

    if (attempt >= 1 || modelCalls >= MAX_MODEL_CALLS) {
      log({event: "mode_all_dropped", mode: MODE_GEAR_FILL,
        dropped: checked.dropped, modelCalls});
      throw new HttpsError("internal", "문제가 생겼어요. 다시 시도해 주세요");
    }

    log({event: "mode_retry", mode: MODE_GEAR_FILL, dropped: checked.dropped});

    const calls = providerModule.extractCalls(history[history.length - 1]);
    const terminalResults = new Map(calls
        .filter((c) => c.name === PROPOSE_GEAR_TOOL)
        .map((c) => [c.id, {
          content: {error: GEAR_FILL_RETRY_ERROR},
          isError: true,
        }]));

    turn = await runOnce({pairing: {calls, writeResults: terminalResults}});
  }

  log({
    event: "mode_result",
    mode: MODE_GEAR_FILL,
    items: checked.items.length,
    essential: checked.items.filter((i) => i.priority === "essential").length,
    dropped: checked.dropped,
    notes: checked.notes.length,
    missing: missingGroups.length,
    warehouse: warehouseEntries.length,
    truncated,
    pastTrips: pastTrips.length,
    pastTotal,
    modelCalls,
    reads,
    usage,
  });

  return {
    ...base,
    result: {
      headline: checked.headline,
      items: checked.items,
      notes: checked.notes,
      trip: {
        ...trip,
        // bag.weather.daily(여행 기간) 우선, 없으면 이 턴의 get_forecast 예보,
        // 둘 다 없으면 null.
        weatherLine: trip.weatherLine ??
          buildWeatherLine({...tripSnapshot, weather: forecastDaily}, locale),
      },
      missingGroups,
      warehouseEmpty: false,
    },
    refused: false,
  };
};

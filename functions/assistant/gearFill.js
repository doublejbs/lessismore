import {HttpsError} from "firebase-functions/v2/https";
import {
  GEAR_FILL_FINAL_CALL_TEXT,
  GEAR_FILL_INSTRUCTION,
  GEAR_FILL_NUDGE,
  GEAR_FILL_PROMPT,
  GEAR_FILL_RETRY_ERROR,
} from "./prompt.js";
import {
  GEAR_FILL_READ_TOOL_NAMES,
  GEAR_FILL_TOOL_DECLARATIONS,
  PROPOSE_GEAR_TOOL,
  createReadTools,
} from "./tools.js";
import {UsageKind, consumeDailyUsage} from "./usage.js";
import {buildFirstTurnPrefix, runTurn} from "./engine.js";

// 모드 호출 gear_fill(장비 자동 채우기) — 앱 레포 specs/Assistant.md
// AS-1(개정)·AS-4·AS-6·AS-9·AS-10·AS-12·AS-13.
// 대화 기록 없이 요청마다 독립: 여행 현황 → 읽기 도구 → propose_gear → 검증 → result.

export const MODE_GEAR_FILL = "gear_fill";

const LOCALES = ["ko", "en", "ja"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_MODEL_CALLS = 8;
const TOOL_LIMITS = {search_catalog: 6};
const MAX_ITEMS = 15;
const MAX_HEADLINE = 60;
const MAX_REASON = 40;
const MAX_NOTES = 3;
const MAX_NOTE_LENGTH = 80;
const PRIORITIES = ["essential", "recommended"];
// 그룹당 1개로 자르는 필수 그룹. 의류·기타 같은 그룹은 날씨 추가(우의·장갑·
// 아이젠)가 여러 개일 수 있어 자르지 않는다(AS-6 "배낭 1·침낭 1·매트 1").
const SINGLE_PER_GROUP = new Set(["tent", "sleeping_bag", "mat", "backpack"]);
const SNOW_SKIES = new Set(["눈", "소낙눈"]);
const SHELTER_KEYWORD = "대피소";
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
 * propose_gear 입력을 검증한다(AS-13).
 * - 이 턴의 도구 결과에 실제로 있던 gearId만 통과, 표시 값은 도구 결과로 덮어쓴다.
 * - 이미 담긴 id·중복 id 제외, essential 먼저 정렬 후 필수 그룹은 1개씩,
 *   15개로 자른다. 버린 개수는 dropped로만 센다.
 * - presetGroups: 이미 채워진 필수 그룹(여행에 담긴 것·대피소 박의 tent).
 */
export const validateProposal = ({
  input,
  seenGear,
  tripGearIds,
  presetGroups = [],
  locale = "ko",
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
      source: seen.source,
      name: seen.name,
      brand: seen.brand,
      weightG: seen.weightG,
      group: seen.group,
      priority: PRIORITIES.includes(raw.priority) ?
        raw.priority :
        "recommended",
      reason: clip(raw.reason, MAX_REASON),
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
    headline: clip(input?.headline, MAX_HEADLINE) ||
      (DEFAULT_HEADLINES[locale] ?? DEFAULT_HEADLINES.ko),
    rawCount: rawItems.length,
    items,
    notes,
    dropped: rawItems.length - items.length,
  };
};

// 읽기 결과에서 고를 수 있었던 장비를 모은다(id → 도구 결과 값).
// 사용자 장비 id는 카탈로그 id와 같아, 창고에 있는 id는 어느 도구에서 왔든
// 출처를 warehouse로 둔다(앱이 카탈로그 등록을 다시 하지 않게).
export const collectSeenGear = (seenGear, warehouseIds, call, content) => {
  const gears = Array.isArray(content?.gears) ? content.gears : [];

  if (!["list_warehouse", "get_popular_gear", "search_catalog"]
      .includes(call.name)) {
    return;
  }

  for (const g of gears) {
    if (!g?.id) {
      continue;
    }

    const source = call.name === "list_warehouse" || warehouseIds.has(g.id) ?
      "warehouse" :
      "catalog";
    const prev = seenGear.get(g.id);

    // 이미 본 id는 출처만 warehouse로 올린다(표시 값은 처음 본 결과 유지).
    if (prev) {
      if (source === "warehouse") {
        prev.source = "warehouse";
      }

      continue;
    }

    seenGear.set(g.id, {
      source,
      name: g.name ?? "",
      brand: g.brand ?? "",
      weightG: Number.isFinite(g.weight) ? g.weight : 0,
      // get_popular_gear 결과에는 group이 없어 요청한 그룹을 쓴다.
      group: g.group ?? content.category ?? call.input?.category ?? "etc",
    });
  }
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
  const location = tripSnapshot.location;

  if (location?.campSpotId &&
    String(location.name ?? "").includes(SHELTER_KEYWORD)) {
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

  // 여행 현황(소유자 확인 포함 — not-found·permission-denied). 메모 본문은 뺀다(AS-10).
  setStage("trip");

  const readTools = createReadTools({uid, bagId, today});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 메모 제외
  const {memo, ...tripSnapshot} = await readTools.getTrip();
  const [tripGearIds, warehouseIds] = await Promise.all([
    readTools.tripGearIds(),
    readTools.warehouseIds(),
  ]);
  const presetGroups = presetEssentialGroups(tripSnapshot);

  setStage("usage");

  const remaining = await consumeDailyUsage(uid, UsageKind.USER_TEXT);

  setStage("turn");

  const handlers = Object.fromEntries(Object.entries(readTools.handlers)
      .filter(([name]) => GEAR_FILL_READ_TOOL_NAMES.has(name)));
  const seenGear = new Map();
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
      toolLimits: TOOL_LIMITS,
      nudgeText: GEAR_FILL_NUDGE,
      finalCall: {tools: [PROPOSE_GEAR_TOOL], text: GEAR_FILL_FINAL_CALL_TEXT},
      onReadResult: (call, content) => {
        collectSeenGear(seenGear, warehouseIds, call, content);

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
    catalog: checked.items.filter((i) => i.source === "catalog").length,
    dropped: checked.dropped,
    notes: checked.notes.length,
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
        name: tripSnapshot.name ?? "",
        startDate: tripSnapshot.startDate ?? "",
        endDate: tripSnapshot.endDate ?? "",
        locationName: tripSnapshot.location?.name || null,
        // bag.weather.daily(여행 기간) 우선, 없으면 이 턴의 get_forecast 예보,
        // 둘 다 없으면 null.
        weatherLine: buildWeatherLine(tripSnapshot, locale) ??
          buildWeatherLine({...tripSnapshot, weather: forecastDaily}, locale),
      },
    },
    refused: false,
  };
};

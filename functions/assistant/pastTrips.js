import {toKstDate} from "../kstDate.js";
import {ESSENTIAL_GROUPS, weatherLabel} from "./tools.js";

// gear_fill 선주입 블록 [창고]·[이전 여행] — 앱 레포 specs/Assistant.md AS-4·AS-10.
// 순수 함수만 둔다(Firestore 읽기는 tools.js createReadTools.loadOwnBags).

export const PAST_TRIPS_READ_LIMIT = 100;
export const PAST_TRIPS_BLOCK_LIMIT = 5;
export const PAST_TRIP_GEAR_LIMIT = 60;
export const WAREHOUSE_BLOCK_LIMIT = 200;
// 강수 여부 판단: 이 확률 이상이거나 하늘 라벨이 비·눈 계열이면 강수.
const PRECIP_PROB_THRESHOLD = 60;
const RAIN_SKIES = new Set(["비", "이슬비", "소나기", "뇌우"]);
const SNOW_SKIES = new Set(["눈", "소낙눈"]);

const uniqueStrings = (list) => [...new Set((Array.isArray(list) ? list : [])
    .filter((id) => typeof id === "string" && id.length > 0))];

/**
 * 지난 여행에 실제로 가져간 장비 id: 패킹을 완료했고 packedGears가 있으면
 * packedGears, 아니면 gears(중복 제거).
 * @param {object} bag bag 문서
 * @return {string[]}
 */
export const tripGearSelection = (bag) => {
  const packed = uniqueStrings(bag?.packedGears);

  if (bag?.packingCompletedAt && packed.length > 0) {
    return packed;
  }

  return uniqueStrings(bag?.gears);
};

const finite = (v) => typeof v === "number" && Number.isFinite(v);

/**
 * bag.weather.daily로 날씨 요약 한 줄을 만든다(최저기온 최솟값·강수 여부).
 * 여행 기간 안 날짜만 쓴다 — 하나도 없으면(다른 날짜 캐시뿐이면) null.
 */
export const summarizePastWeather = (bag, startDate, endDate) => {
  const all = (Array.isArray(bag?.weather?.daily) ? bag.weather.daily : [])
      .filter((d) => d && typeof d === "object");
  const days = all.filter((d) => typeof d.date === "string" &&
    startDate && endDate && d.date >= startDate && d.date <= endDate);

  if (days.length === 0) {
    return null;
  }

  const lows = days.map((d) => d.tempMin).filter(finite);
  const skies = days.map((d) => weatherLabel(d.code));
  const snowy = skies.some((s) => SNOW_SKIES.has(s));
  const rainy = skies.some((s) => RAIN_SKIES.has(s)) ||
    days.some((d) => finite(d.precipProb) &&
      d.precipProb >= PRECIP_PROB_THRESHOLD);
  const parts = [];

  if (lows.length > 0) {
    parts.push(`최저 ${Math.round(Math.min(...lows))}°`);
  }

  parts.push(snowy ? "눈" : rainy ? "비" : "강수 없음");

  return parts.join(" · ");
};

/**
 * 읽은 배낭 문서에서 지난 여행을 고른다(AS-4).
 * - 종료일(KST)이 today보다 앞서고 장비가 1개 이상인 것만. 현재 배낭 제외.
 * - tripCounts: 고른 지난 여행 **전체**에서 장비 id별 담긴 횟수.
 * - trips: 종료일 내림차순 최근 5건, 장비 id는 창고에 있는 것만 60개까지
 *   (남는 id가 없는 여행은 블록에서 뺀다 — 모델이 참고할 게 없다).
 * uid·메모·공유 여부 등은 담지 않는다(AS-10).
 * @return {{trips: object[], tripCounts: Map<string, number>, total: number}}
 */
export const selectPastTrips = ({bags, today, currentBagId, warehouseIds}) => {
  const past = (Array.isArray(bags) ? bags : [])
      .filter((b) => b && b.id !== currentBagId)
      .map((b) => ({
        bag: b,
        startDate: toKstDate(b.startDate),
        endDate: toKstDate(b.endDate),
      }))
      .filter(({bag, endDate}) => endDate && endDate < today &&
        Array.isArray(bag.gears) && bag.gears.length >= 1)
      .map((entry) => ({...entry, gearIds: tripGearSelection(entry.bag)}))
      .sort((a, b) => b.endDate.localeCompare(a.endDate));
  const tripCounts = new Map();

  for (const {gearIds} of past) {
    for (const id of gearIds) {
      tripCounts.set(id, (tripCounts.get(id) ?? 0) + 1);
    }
  }

  const trips = [];

  for (const {bag, startDate, endDate, gearIds} of past) {
    if (trips.length >= PAST_TRIPS_BLOCK_LIMIT) {
      break;
    }

    const ownedIds = gearIds.filter((id) => warehouseIds.has(id))
        .slice(0, PAST_TRIP_GEAR_LIMIT);

    if (ownedIds.length === 0) {
      continue;
    }

    const from = startDate || endDate;
    const entry = {
      name: String(bag.name ?? ""),
      dates: from === endDate ? endDate : `${from}~${endDate}`,
    };
    const place = String(bag.location?.name ?? "").trim();
    const weather = summarizePastWeather(bag, startDate, endDate);

    if (place) {
      entry.place = place;
    }

    if (weather) {
      entry.weather = weather;
    }

    entry.gearIds = ownedIds;
    trips.push(entry);
  }

  return {trips, tripCounts, total: past.length};
};

/**
 * [창고] 블록 항목: 이 배낭에 안 담긴 창고 장비에 trips(지난 여행에 담긴 횟수)를
 * 붙인다. 200개를 넘으면 무거운 필수 장비가 잘리지 않게 필수 4종 그룹을 먼저
 * 넣고(각각 가벼운 순) 나머지를 가벼운 순으로 채운다. 블록 안 순서는 가벼운 순.
 * 키는 토큰 절약용 짧은 이름.
 * @return {{entries: object[], truncated: number,
 *   truncatedByGroup: Object<string, number>}}
 */
export const buildWarehouseEntries = ({available, tripCounts}) => {
  const byWeight = (a, b) => a.weight - b.weight;
  const essential = new Set(ESSENTIAL_GROUPS);
  const prioritized = [
    ...available.filter((g) => essential.has(g.group)).sort(byWeight),
    ...available.filter((g) => !essential.has(g.group)).sort(byWeight),
  ];
  const kept = prioritized.slice(0, WAREHOUSE_BLOCK_LIMIT);
  const truncatedByGroup = {};

  for (const g of prioritized.slice(WAREHOUSE_BLOCK_LIMIT)) {
    truncatedByGroup[g.group] = (truncatedByGroup[g.group] ?? 0) + 1;
  }

  const entries = kept.sort(byWeight).map((g) => ({
    id: g.id,
    name: g.name,
    brand: g.brand,
    g: g.weight,
    group: g.group,
    trips: tripCounts.get(g.id) ?? 0,
  }));

  return {
    entries,
    truncated: prioritized.length - entries.length,
    truncatedByGroup,
  };
};

// 잘린 그룹 안내 조각. 예: "clothing 12·etc 7"(많은 순).
const formatTruncatedGroups = (truncatedByGroup) =>
  Object.entries(truncatedByGroup ?? {})
      .sort((a, b) => b[1] - a[1])
      .map(([group, n]) => `${group} ${n}`)
      .join("·");

/**
 * 첫 사용자 메시지에 붙일 [창고]·[이전 여행] 블록 문자열.
 * 지난 여행이 없으면 [이전 여행] 블록을 넣지 않는다.
 */
export const buildGearFillBlocks = ({
  warehouseEntries,
  truncated,
  truncatedByGroup,
  trips,
}) => {
  const lines = [
    `[창고] 이 여행에 안 담긴 내 장비 ${warehouseEntries.length}개` +
      "(가벼운 순, g=무게 g, trips=지난 여행에 담긴 횟수)" +
      (truncated > 0 ?
        ` — ${truncated}개 더 있음, 잘린 그룹: ` +
          `${formatTruncatedGroups(truncatedByGroup)} — 필요하면 ` +
          "list_warehouse(category)로 읽기" :
        ""),
    JSON.stringify(warehouseEntries),
  ];

  if (trips.length > 0) {
    lines.push(
        `[이전 여행] 최근 지난 여행 ${trips.length}건(종료일 최근 순, ` +
          "gearIds=그때 담은 장비 중 지금 창고에 있는 것)",
        JSON.stringify(trips),
    );
  }

  return `${lines.join("\n")}\n\n`;
};

import admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import {liteClient} from "algoliasearch/lite";

// 앱 레포 specs/Assistant.md AS-4(읽기 도구)·AS-5(쓰기 도구).
// 읽기 도구는 Admin SDK·외부 API로 서버에서 실행하고, 쓰기 도구는 선언만 한다
// (앱이 적용 카드로 확인받고 기존 스토어로 실행한다).

const ALGOLIA_APP_ID = "BWS6CWRXRM";
// 검색 전용 공개 키(앱 번들에도 들어 있다).
const ALGOLIA_SEARCH_API_KEY = "dafcc0c015856d4ca5fb6d0626cf8f9f";
const ALGOLIA_INDEX = "useless-gear-search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const FORECAST_TIMEOUT_MS = 10000;
// Open-Meteo forecast는 오늘 포함 16일(오늘+15일)까지만 받는다.
const FORECAST_FUTURE_DAYS = 15;
const DAY_MS = 24 * 60 * 60 * 1000;
const CAMP_SPOT_CACHE_MS = 10 * 60 * 1000;
const ACTIVE_SPOT_STATUS = "active";
const WAREHOUSE_LIMIT = 200;
const DESCRIPTION_MAX = 160;
const FIRESTORE_IN_LIMIT = 30;
// 보유 장비를 빼고도 N개(≤5)가 남도록 순위를 넉넉히 읽는다.
const POPULAR_RANK_LIMIT = 20;
const DATE_PATTERN = "^\\d{4}-\\d{2}-\\d{2}$";
const DATE_RE = new RegExp(DATE_PATTERN);

// DM-4 1차 그룹 → 세분 카테고리(앱 GearCategoryGroups와 같은 매핑).
const CATEGORY_GROUPS = {
  tent: ["tent", "tarp", "shelter", "tent_acc"],
  sleeping_bag: ["sleeping_bag"],
  mat: ["mat", "pillow"],
  backpack: ["backpack", "vest_pack", "backpack_cover", "pouch"],
  clothing: ["clothing", "gloves", "gaiter", "sunglasses"],
  furniture: ["furniture", "chair", "table", "furniture_etc"],
  lantern: ["lantern", "lighting", "headlamp"],
  cooking: [
    "cooking", "cookware", "stove", "torch", "cup", "bowl", "cutlery",
    "bottle", "cookware_etc",
  ],
  electronic: ["electronic"],
  food: ["food"],
  etc: [
    "etc", "towel", "hand_warmer", "shovel", "hammer", "microspikes",
    "trekking_pole",
  ],
};
const GROUP_KEYS = Object.keys(CATEGORY_GROUPS);
const GROUP_LABEL = {
  tent: "텐트",
  sleeping_bag: "침낭",
  mat: "매트",
  backpack: "배낭",
  clothing: "의류",
  furniture: "가구",
  lantern: "랜턴",
  cooking: "조리",
  electronic: "전자기기",
  food: "음식",
  etc: "기타",
};

const groupOf = (fineKey) =>
  GROUP_KEYS.find((g) => CATEGORY_GROUPS[g].includes(fineKey)) ?? "etc";

// 앱 WeatherCode.ts의 한글 라벨과 같다.
const weatherLabel = (code) => {
  if (typeof code !== "number") {
    return "알 수 없음";
  }

  if (code === 0) {
    return "맑음";
  }

  if (code <= 3) {
    return "구름";
  }

  if (code === 45 || code === 48) {
    return "안개";
  }

  if (code >= 51 && code <= 57) {
    return "이슬비";
  }

  if (code >= 61 && code <= 67) {
    return "비";
  }

  if (code >= 71 && code <= 77) {
    return "눈";
  }

  if (code >= 80 && code <= 82) {
    return "소나기";
  }

  if (code >= 85 && code <= 86) {
    return "소낙눈";
  }

  if (code >= 95) {
    return "뇌우";
  }

  return "알 수 없음";
};

const displayName = (g) => g.nameKorean || g.name || "(이름 없음)";
const displayBrand = (g) => g.companyKorean || g.company || "";
const gramsOf = (g) => {
  const n = Number(g.weight);

  return Number.isFinite(n) ? Math.round(n) : 0;
};

const toGearSummary = (id, g) => ({
  id,
  name: displayName(g),
  brand: displayBrand(g),
  group: groupOf(g.category ?? "etc"),
  weight: gramsOf(g),
});

const chunk = (arr, size) => {
  const out = [];

  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }

  return out;
};

const clampInt = (value, fallback, min, max) => {
  const n = Math.trunc(Number(value));

  if (!Number.isFinite(n)) {
    return fallback;
  }

  return Math.min(Math.max(n, min), max);
};

const kstToday = () =>
  new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

const addDays = (isoDate, days) =>
  new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS)
      .toISOString()
      .slice(0, 10);

let algoliaClient = null;

const getAlgolia = () => {
  if (!algoliaClient) {
    algoliaClient = liteClient(ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY);
  }

  return algoliaClient;
};

// camp-spot(active)은 500여 건이라 인스턴스 메모리에 10분 캐시한다(AS-4).
// 동시 요청이 한 번만 읽도록 promise를 캐시하고, 실패하면 캐시를 비운다.
// 검색용 소문자 문자열(haystack)을 미리 만들어 둔다.
let campSpotPromise = null;
let campSpotCachedAt = 0;

const toSearchText = (s) =>
  [s.name, s.region, s.city, s.description, ...(s.tags ?? [])]
      .map((v) => String(v ?? "").toLowerCase())
      .join("\n");

const loadCampSpots = (db) => {
  if (campSpotPromise && Date.now() - campSpotCachedAt < CAMP_SPOT_CACHE_MS) {
    return campSpotPromise;
  }

  campSpotCachedAt = Date.now();
  campSpotPromise = db
      .collection("camp-spot")
      .where("status", "==", ACTIVE_SPOT_STATUS)
      .get()
      .then((snap) => snap.docs.map((d) => {
        const spot = {id: d.id, ...d.data()};

        return {spot, searchText: toSearchText(spot)};
      }))
      .catch((err) => {
        campSpotPromise = null;
        throw err;
      });

  return campSpotPromise;
};

// ---------- 도구 선언(모델에 보내는 스키마 — 프로토타입과 동일) ----------

const groupEnumDesc = `DM-4 1차 그룹 키: ${GROUP_KEYS
    .map((k) => `${k}(${GROUP_LABEL[k]})`)
    .join(", ")}`;

const categorySchema = {
  type: "string",
  enum: GROUP_KEYS,
  description: groupEnumDesc,
};

const gearItemSchema = {
  type: "object",
  properties: {
    gearId: {type: "string"},
    source: {type: "string", enum: ["warehouse", "catalog"]},
    name: {type: "string", description: "카드에 보여 줄 장비 이름"},
  },
  required: ["gearId", "source", "name"],
  additionalProperties: false,
};

const summarySchema = {
  type: "string",
  description: "사용자에게 보여 줄 한 줄 요약(한국어, 60자 이내)",
};

export const TOOL_DECLARATIONS = [
  {
    name: "get_trip",
    description: "현재 대상 여행의 최신 현황(이름·기간·단계·여행지·날씨·" +
      "담긴 장비·총 무게·메모)을 읽는다. 변경을 적용한 뒤 최신 상태가 " +
      "필요하면 다시 호출한다.",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "list_warehouse",
    description: "사용자 창고에서 이 여행에 아직 담기지 않은 장비를 가벼운 " +
      "순으로 나열한다(최대 200개). 창고에서 담을 후보를 찾을 때 쓴다.",
    input_schema: {
      type: "object",
      properties: {
        category: categorySchema,
      },
      additionalProperties: false,
    },
  },
  {
    name: "search_catalog",
    description: "전체 장비 카탈로그(수만 개)를 검색한다. 창고에 없는 장비를 " +
      "추천·담을 때 쓴다. 결과의 id는 source=\"catalog\"로 넣는다.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "검색어(제품명·브랜드·종류. 예: \"경량 침낭\", " +
            "\"제로그램\", \"900g 텐트\")",
        },
        category: categorySchema,
        limit: {type: "integer", minimum: 1, maximum: 10},
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "get_popular_gear",
    description: "카테고리별로 사용자들이 가장 많이 보유한 카탈로그 장비 " +
      "상위 5개를 준다(창고·여행에 있는 것은 제외). 뭘 사야 할지 막막한 " +
      "사용자에게 기본 추천으로 쓴다. 결과의 id는 source=\"catalog\"로 넣는다.",
    input_schema: {
      type: "object",
      properties: {
        category: categorySchema,
        limit: {type: "integer", minimum: 1, maximum: 5},
      },
      required: ["category"],
      additionalProperties: false,
    },
  },
  {
    name: "search_camp_spots",
    description: "앱에 등록된 박지 532곳(국립공원 대피소 12, 야영장 256, " +
      "노지 264)을 찾는다. 검색어는 이름·지역(강원/경남…)·시군·설명·태그" +
      "(mountain/valley/island/beach/lake/plain/forest)에 부분 일치한다" +
      "(단어별 AND). 여행지는 반드시 이 결과의 id로만 설정한다. 결과의 " +
      "warnings(예약·규제)를 사용자에게 꼭 전한다.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "예: \"지리산\", \"설악산 대피소\", \"강원 mountain\", " +
            "\"세석\"",
        },
        type: {
          type: "string",
          enum: ["shelter", "campground", "wild"],
          description: "shelter=대피소, campground=야영장, wild=노지",
        },
        limit: {type: "integer", minimum: 1, maximum: 8},
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "get_forecast",
    description: "좌표의 일별 예보(하늘·최고/최저기온·강수확률·돌풍)를 준다. " +
      "오늘부터 16일 이내만 가능하고 그 밖이면 available=false. 박지 좌표와 " +
      "여행 날짜가 정해지면 호출해 장비 조언에 쓴다.",
    input_schema: {
      type: "object",
      properties: {
        latitude: {type: "number"},
        longitude: {type: "number"},
        startDate: {type: "string", pattern: DATE_PATTERN},
        endDate: {type: "string", pattern: DATE_PATTERN},
      },
      required: ["latitude", "longitude", "startDate", "endDate"],
      additionalProperties: false,
    },
  },
  // ----- 쓰기(사용자 확인 뒤 앱이 적용) -----
  {
    name: "add_gears",
    description: "장비를 이 여행에 담는다(카탈로그 장비는 창고에도 등록됨). " +
      "사용자가 확인한 뒤 적용되며 결과는 도구 결과로 온다. 한 번에 최대 10개.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          minItems: 1,
          maxItems: 10,
          items: gearItemSchema,
        },
        summary: summarySchema,
      },
      required: ["items", "summary"],
      additionalProperties: false,
    },
  },
  {
    name: "remove_gears",
    description: "이 여행에서 장비를 뺀다(창고에는 남는다). 사용자가 확인한 " +
      "뒤 적용된다.",
    input_schema: {
      type: "object",
      properties: {
        gearIds: {
          type: "array",
          minItems: 1,
          maxItems: 10,
          items: {type: "string"},
        },
        names: {
          type: "array",
          items: {type: "string"},
          description: "카드에 보여 줄 장비 이름(gearIds와 같은 순서)",
        },
        summary: summarySchema,
      },
      required: ["gearIds", "names", "summary"],
      additionalProperties: false,
    },
  },
  {
    name: "update_trip_info",
    description: "여행 이름·시작일·종료일을 바꾼다. 날짜는 YYYY-MM-DD. " +
      "바꾸지 않는 값은 생략한다.",
    input_schema: {
      type: "object",
      properties: {
        name: {type: "string"},
        startDate: {type: "string", pattern: DATE_PATTERN},
        endDate: {type: "string", pattern: DATE_PATTERN},
        summary: summarySchema,
      },
      required: ["summary"],
      additionalProperties: false,
    },
  },
  {
    name: "set_destination",
    description: "여행지를 등록 박지로 설정한다. search_camp_spots로 찾은 " +
      "id만 쓴다.",
    input_schema: {
      type: "object",
      properties: {
        campSpotId: {type: "string"},
        name: {type: "string"},
        summary: summarySchema,
      },
      required: ["campSpotId", "name", "summary"],
      additionalProperties: false,
    },
  },
  {
    name: "update_memo",
    description: "여행 메모를 저장한다(기존 메모를 덮어쓴다, 500자 이내).",
    input_schema: {
      type: "object",
      properties: {
        memo: {type: "string", maxLength: 500},
        summary: summarySchema,
      },
      required: ["memo", "summary"],
      additionalProperties: false,
    },
  },
  {
    name: "create_trip",
    description: "계획이 정해지면 여행을 만든다. 이름·기간은 필수. 박지" +
      "(campSpotId — search_camp_spots 결과의 id), 메모(코스 요약: 구간·" +
      "거리·소요·대피소 예약·주의사항, 500자 이내), 장비(gears — 창고 또는 " +
      "카탈로그 id, 15개 이내)를 함께 넣을 수 있다. 사용자가 적용 카드에서 " +
      "확인한 뒤 만들어진다.",
    input_schema: {
      type: "object",
      properties: {
        name: {type: "string", description: "예: \"지리산 화대종주 1박\""},
        startDate: {type: "string", pattern: DATE_PATTERN},
        endDate: {type: "string", pattern: DATE_PATTERN},
        campSpotId: {type: "string"},
        campSpotName: {type: "string"},
        memo: {type: "string", maxLength: 500},
        gears: {type: "array", maxItems: 15, items: gearItemSchema},
        summary: summarySchema,
      },
      required: ["name", "startDate", "endDate", "summary"],
      additionalProperties: false,
    },
  },
];

export const WRITE_TOOL_NAMES = new Set([
  "create_trip",
  "add_gears",
  "remove_gears",
  "update_trip_info",
  "set_destination",
  "update_memo",
]);

export const isWriteTool = (name) => WRITE_TOOL_NAMES.has(name);

// ---------- 읽기 도구 구현 ----------

/**
 * 요청 하나에 묶인 읽기 도구 집합을 만든다.
 * 같은 요청 안에서는 대상 여행·창고를 한 번만 읽는다.
 */
export const createReadTools = ({uid, bagId, today}) => {
  const db = admin.firestore();
  const {FieldPath} = admin.firestore;
  let bagPromise = null;
  let warehousePromise = null;

  // 대상 여행 문서. 본인 여행이 아니면 permission-denied(AS-4).
  const loadBag = () => {
    if (!bagId) {
      return Promise.resolve(null);
    }

    if (!bagPromise) {
      bagPromise = db.collection("bag").doc(bagId).get().then((snap) => {
        if (!snap.exists) {
          throw new HttpsError("not-found", "여행을 찾을 수 없습니다.");
        }

        const data = snap.data();

        if (data.userId !== uid) {
          throw new HttpsError("permission-denied", "여행에 접근할 수 없습니다.");
        }

        return data;
      });
    }

    return bagPromise;
  };

  const loadWarehouse = () => {
    if (!warehousePromise) {
      warehousePromise = db
          .collection("users").doc(uid).collection("gears")
          .get()
          .then((snap) => snap.docs.map((d) => toGearSummary(d.id, d.data())));
    }

    return warehousePromise;
  };

  const tripGearIds = async () => {
    const bag = await loadBag();

    return new Set(Array.isArray(bag?.gears) ? bag.gears : []);
  };

  const fetchUserGearsByIds = async (ids) => {
    const found = new Map();
    const gearsRef = db.collection("users").doc(uid).collection("gears");

    for (const part of chunk(ids, FIRESTORE_IN_LIMIT)) {
      const snap = await gearsRef
          .where(FieldPath.documentId(), "in", part)
          .get();

      snap.forEach((d) => found.set(d.id, toGearSummary(d.id, d.data())));
    }

    return ids.map((id) => found.get(id)).filter(Boolean);
  };

  const tripPhase = (startDate, endDate) => {
    if (!startDate || today < startDate) {
      return "before";
    }

    if (endDate && today > endDate) {
      return "after";
    }

    return "ongoing";
  };

  const getTrip = async () => {
    const bag = await loadBag();

    if (!bag) {
      return {
        trip: null,
        note: "아직 여행이 없습니다. create_trip으로 만들 수 있습니다.",
      };
    }

    const gearIds = Array.isArray(bag.gears) ? bag.gears : [];
    const gears = gearIds.length > 0 ? await fetchUserGearsByIds(gearIds) : [];
    const startDate = String(bag.startDate ?? "").slice(0, 10);
    const endDate = String(bag.endDate ?? "").slice(0, 10);
    const location = bag.location ? {
      name: bag.location.name ?? "",
      latitude: bag.location.latitude ?? null,
      longitude: bag.location.longitude ?? null,
      campSpotId: bag.location.campSpotId ?? null,
    } : null;
    const daily = Array.isArray(bag.weather?.daily) ? bag.weather.daily : null;
    const weather = daily ? daily.map((w) => ({
      date: w.date,
      sky: weatherLabel(w.code),
      tempMax: w.tempMax ?? null,
      tempMin: w.tempMin ?? null,
      precipProb: w.precipProb ?? null,
      windGustMax: w.windGustMax ?? null,
    })) : null;
    const byGroup = {};

    for (const g of gears) {
      byGroup[g.group] = (byGroup[g.group] ?? 0) + 1;
    }

    return {
      bagId,
      name: bag.name ?? "",
      startDate,
      endDate,
      phase: tripPhase(startDate, endDate),
      location,
      weather,
      memo: bag.memo ?? "",
      totalWeightG: gears.reduce((s, g) => s + g.weight, 0),
      gearCount: gears.length,
      gearCountByGroup: byGroup,
      gears,
      packedCount: Array.isArray(bag.packedGears) ? bag.packedGears.length : 0,
    };
  };

  const listWarehouse = async ({category}) => {
    const [all, inTrip] = await Promise.all([loadWarehouse(), tripGearIds()]);
    const list = all
        .filter((g) => !category || g.group === category)
        .filter((g) => !inTrip.has(g.id))
        .sort((a, b) => a.weight - b.weight)
        .slice(0, WAREHOUSE_LIMIT);

    return {count: list.length, gears: list};
  };

  const searchCatalog = async ({query, category, limit}) => {
    const hitsPerPage = clampInt(limit, 5, 1, 10);
    const keyword = String(query ?? "").trim();
    const facetFilters = category && CATEGORY_GROUPS[category] ?
      [CATEGORY_GROUPS[category].map((k) => `category:${k}`)] :
      undefined;
    const searchOnce = async (q) => {
      const {results} = await getAlgolia().search({
        requests: [{
          indexName: ALGOLIA_INDEX,
          query: q,
          hitsPerPage,
          ...(facetFilters ? {facetFilters} : {}),
        }],
      });

      return results[0]?.hits ?? [];
    };
    let usedQuery = keyword;
    let hits = await searchOnce(keyword);

    // "경량 침낭"처럼 수식어가 붙으면 0건이 되기 쉽다 — 마지막 단어로 한 번 더.
    if (hits.length === 0 && keyword.includes(" ")) {
      const words = keyword.split(/\s+/);

      usedQuery = words[words.length - 1];
      hits = await searchOnce(usedQuery);
    }

    return {
      query: usedQuery,
      count: hits.length,
      gears: hits.map((h) => toGearSummary(h.objectID, h)),
    };
  };

  const getPopularGear = async ({category, limit}) => {
    const n = clampInt(limit, 5, 1, 5);
    const fineKeys = CATEGORY_GROUPS[category];

    if (!fineKeys) {
      return {error: `알 수 없는 카테고리 ${category}`};
    }

    // OB-6과 같은 쿼리 — gear-rank의 category는 1차 그룹 키다.
    const rankSnap = await db
        .collection("gear-rank")
        .where("category", "==", category)
        .orderBy("count", "desc")
        .limit(POPULAR_RANK_LIMIT)
        .get();
    const ranked = rankSnap.docs.map((d) => ({
      id: d.id,
      count: d.data().count ?? 0,
    }));
    const [warehouse, inTrip] = await Promise.all([
      loadWarehouse(),
      tripGearIds(),
    ]);
    const owned = new Set([...warehouse.map((g) => g.id), ...inTrip]);
    const candidates = ranked.filter((r) => !owned.has(r.id));
    const refs = candidates.map((r) => db.collection("gear").doc(r.id));
    const snaps = refs.length > 0 ? await db.getAll(...refs) : [];
    const out = [];

    snaps.forEach((snap, i) => {
      if (!snap.exists || out.length >= n) {
        return;
      }

      const g = toGearSummary(snap.id, snap.data());

      out.push({
        id: g.id,
        name: g.name,
        brand: g.brand,
        weight: g.weight,
        count: candidates[i].count,
      });
    });

    return {category, gears: out};
  };

  const searchCampSpots = async ({query, type, limit}) => {
    const n = clampInt(limit, 5, 1, 8);
    const terms = String(query ?? "")
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
    const all = await loadCampSpots(db);
    const spots = all
        .filter(({spot, searchText}) =>
          terms.every((t) => searchText.includes(t)) &&
          (!type || spot.type === type))
        .slice(0, n)
        .map(({spot: s}) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          region: [s.region, s.city].filter(Boolean).join(" "),
          tags: s.tags ?? [],
          facilities: s.facilities ?? [],
          description: String(s.description ?? "").slice(0, DESCRIPTION_MAX),
          accessInfo: s.accessInfo ?? null,
          warnings: s.warnings ?? null,
          latitude: s.location?.latitude ?? null,
          longitude: s.location?.longitude ?? null,
        }));

    return {count: spots.length, spots};
  };

  // Open-Meteo 일별 예보(오늘 포함 16일 이내). 앱 WeatherService와 같은 소스.
  const getForecast = async ({latitude, longitude, startDate, endDate}) => {
    const now = kstToday();
    const last = addDays(now, FORECAST_FUTURE_DAYS);
    const start = String(startDate ?? "");
    const end = String(endDate ?? start);

    if (!DATE_RE.test(start) || !DATE_RE.test(end)) {
      return {error: "날짜는 YYYY-MM-DD 형식이어야 합니다."};
    }

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon) ||
      Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      return {error: "좌표가 올바르지 않습니다."};
    }

    if (start > last) {
      return {
        available: false,
        note: `예보는 ${last}까지만 제공됩니다(16일). 평년 기준으로 조언하세요.`,
      };
    }

    if (end < now) {
      return {available: false, note: "지난 날짜의 예보는 없습니다."};
    }

    const url = new URL(FORECAST_URL);

    url.search = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      daily: "weather_code,temperature_2m_max,temperature_2m_min," +
        "precipitation_probability_max,wind_gusts_10m_max",
      timezone: "Asia/Seoul",
      start_date: start < now ? now : start,
      end_date: end > last ? last : end,
    }).toString();

    const res = await fetch(url, {
      signal: AbortSignal.timeout(FORECAST_TIMEOUT_MS),
    });

    if (!res.ok) {
      return {available: false, note: `예보 조회 실패(${res.status})`};
    }

    const json = await res.json();
    const d = json.daily ?? {};
    const daily = (d.time ?? []).map((date, i) => ({
      date,
      sky: weatherLabel(d.weather_code?.[i]),
      tempMax: d.temperature_2m_max?.[i] ?? null,
      tempMin: d.temperature_2m_min?.[i] ?? null,
      precipProb: d.precipitation_probability_max?.[i] ?? null,
      windGustMax: d.wind_gusts_10m_max?.[i] ?? null,
    }));

    return {available: true, partial: end > last, daily};
  };

  const handlers = {
    get_trip: getTrip,
    list_warehouse: listWarehouse,
    search_catalog: searchCatalog,
    get_popular_gear: getPopularGear,
    search_camp_spots: searchCampSpots,
    get_forecast: getForecast,
  };

  return {handlers, getTrip};
};

import process from "node:process";
import admin from "firebase-admin";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions";

// 앱 레포 specs/Notification.md NT-11(주말 날씨 브리핑), specs/DataModel.md DM-34·DM-35.
const REGION = "asia-northeast3";
const TIME_ZONE = "Asia/Seoul";
const SCHEDULE = "every thursday 18:30";
const CONFIG_DOC_PATH = "config/weekendBriefing";
const RUN_LOG_COLLECTION = "weekend-briefing-runs";
const PUSH_TOKEN_COLLECTION = "push-tokens";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const UPCOMING_TRIP_DAYS = 14;
// Open-Meteo forecast는 오늘 포함 16일(오늘+15일)까지만 받는다(앱 WeatherService와 같은 한도).
const FORECAST_FUTURE_DAYS = 15;
const MAX_TRIP_SUMMARY_DAYS = 3;
const WIND_WARNING_MS = 10;
const USER_CONCURRENCY = 10;
// 한 묶음(10명) 안에서 동시에 날아가는 Open-Meteo 요청 상한.
const FORECAST_CONCURRENCY = 8;
const FORECAST_TIMEOUT_MS = 10000;
const FORECAST_RETRY_DELAY_MS = 1500;
const DRY_RUN_ENV = "BRIEFING_DRY_RUN";
const NOTIFICATION_TYPE = "weekend_briefing";
const ACTIVE_SPOT_STATUS = "active";
// 중단 스위치는 enabled 하나다. 발송 시각은 SCHEDULE(코드)만 결정한다.
const DEFAULT_CONFIG = Object.freeze({
  enabled: true,
  maxTargets: 2000,
});
// FCM이 이 코드로 거절한 토큰은 다시 쓸 수 없으므로 문서를 지운다(NT-11 실패 토큰 정리).
const NOT_REGISTERED_ERROR_CODE = "messaging/registration-token-not-registered";
// invalid-argument는 페이로드 탓일 수도 있어, 같은 uid의 다른 토큰이 성공했을 때만 지운다.
const INVALID_ARGUMENT_ERROR_CODE = "messaging/invalid-argument";
// 실행 전체 토큰 중 invalid-argument가 이 비율을 넘으면 페이로드 문제로 보고 이후 삭제를 멈춘다.
const INVALID_ARGUMENT_HALT_RATIO = 0.2;

const RunStatus = Object.freeze({
  PUBLISHED: "published",
  EMPTY: "empty",
});

const RunSkipReason = Object.freeze({
  DISABLED: "disabled",
});

const SpotSource = Object.freeze({
  UPCOMING_TRIP: "upcoming_trip",
  FAVORITE: "favorite",
  RECENT_TRIP: "recent_trip",
});

const SkipReason = Object.freeze({
  NO_SPOT: "no_spot",
  NO_WEATHER: "no_weather",
});

// 앱 model/weather/WeatherCode.ts + locales/ko.json `weather.code.*`와 같은 한글 상태.
const WEATHER_LABELS = Object.freeze({
  0: "맑음",
  1: "대체로 맑음",
  2: "구름 조금",
  3: "흐림",
  45: "안개",
  48: "서리 안개",
  51: "약한 이슬비",
  53: "이슬비",
  55: "강한 이슬비",
  56: "어는 이슬비",
  57: "강한 어는 이슬비",
  61: "약한 비",
  63: "비",
  65: "강한 비",
  66: "어는 비",
  67: "강한 어는 비",
  71: "약한 눈",
  73: "눈",
  75: "강한 눈",
  77: "싸락눈",
  80: "약한 소나기",
  81: "소나기",
  82: "강한 소나기",
  85: "약한 소낙눈",
  86: "강한 소낙눈",
  95: "뇌우",
  96: "우박 동반 뇌우",
  99: "강한 우박 뇌우",
});
const UNKNOWN_WEATHER_LABEL = "정보 없음";
// 앱 WeatherCode.ts의 RAIN_CODES·SNOW_CODES와 같은 값.
const RAIN_CODES = new Set([
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99,
]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

export const getWeatherLabel = (code) => {
  return WEATHER_LABELS[code] ?? UNKNOWN_WEATHER_LABEL;
};

/**
 * KST 달력 기준 ISO 8601 주 ID(예: 2026-W42)를 만든다.
 * feedRotation.js의 getKstIsoWeekId와 같은 규칙이다(모듈 간 결합을 피하려고 복제).
 */
export const getKstIsoWeekId = (date) => {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const day = kst.getUTCDay() || 7;
  const thursday = Date.UTC(
    kst.getUTCFullYear(),
    kst.getUTCMonth(),
    kst.getUTCDate() + 4 - day,
  );
  const isoYear = new Date(thursday).getUTCFullYear();
  const week = Math.ceil(((thursday - Date.UTC(isoYear, 0, 1)) / DAY_MS + 1) / 7);

  return `${isoYear}-W${String(week).padStart(2, "0")}`;
};

// Date → KST 달력 날짜 문자열(YYYY-MM-DD).
export const toKstDateString = (date) => {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
};

// YYYY-MM-DD에 일수를 더한다(달력 연산이라 UTC 자정 기준으로 계산).
export const addDays = (dateString, days) => {
  const base = Date.parse(`${dateString}T00:00:00Z`);

  return new Date(base + days * DAY_MS).toISOString().slice(0, 10);
};

const diffDays = (fromDateString, toDateString) => {
  const from = Date.parse(`${fromDateString}T00:00:00Z`);
  const to = Date.parse(`${toDateString}T00:00:00Z`);

  return Math.round((to - from) / DAY_MS);
};

const getWeekdayLabel = (dateString) => {
  return WEEKDAY_LABELS[new Date(`${dateString}T00:00:00Z`).getUTCDay()];
};

/**
 * 실행 시각 기준 "이번 토·일"(KST). 토요일에 돌면 그날부터, 일요일이면 다음 주말이다.
 */
export const getUpcomingWeekend = (runAt) => {
  const today = toKstDateString(runAt);
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const saturday = addDays(today, (6 - weekday + 7) % 7);

  return {startDate: saturday, endDate: addDays(saturday, 1)};
};

const toIsoString = (value) => {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  return null;
};

const parseDate = (value) => {
  const iso = toIsoString(value);

  if (!iso) {
    return null;
  }

  const time = Date.parse(iso);

  return Number.isNaN(time) ? null : new Date(time);
};

const getCampSpotId = (bag) => {
  const spotId = bag?.location?.campSpotId;

  return typeof spotId === "string" && spotId.length > 0 ? spotId : null;
};

/**
 * NT-11 ①·③ 후보를 사용자 배낭 목록에서 고른다(쓰기 없음).
 * ① KST 날짜로 오늘~오늘+14일 안에 시작하는 배낭 중 가장 빠른 것, ③ endDate가 가장 늦은 것.
 * 둘 다 location.campSpotId가 있는 배낭만 본다.
 */
export const pickTripCandidates = ({bags, runAt}) => {
  const today = toKstDateString(runAt);
  const windowEnd = addDays(today, UPCOMING_TRIP_DAYS);
  const withSpot = bags
    .map((bag) => ({
      ...bag,
      spotId: getCampSpotId(bag),
      start: parseDate(bag.startDate),
      end: parseDate(bag.endDate),
    }))
    .filter((bag) => bag.spotId !== null);
  const upcoming = withSpot
    .filter((bag) => {
      if (bag.start === null) {
        return false;
      }

      const startDate = toKstDateString(bag.start);

      return startDate >= today && startDate <= windowEnd;
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const recent = withSpot
    .filter((bag) => bag.end !== null)
    .sort((a, b) => b.end.getTime() - a.end.getTime());

  return {
    upcomingTrip: upcoming[0] ?? null,
    recentTrip: recent[0] ?? null,
  };
};

/**
 * 여행 기간을 KST 날짜로 바꾸고 최대 3일, 예보 한도(오늘+15일) 안으로 자른다.
 */
export const getTripRange = ({trip, runAt}) => {
  const today = toKstDateString(runAt);
  const startDate = toKstDateString(trip.start);
  const rawEnd = trip.end && trip.end >= trip.start ?
    toKstDateString(trip.end) :
    startDate;
  const limits = [
    rawEnd,
    addDays(startDate, MAX_TRIP_SUMMARY_DAYS - 1),
    addDays(today, FORECAST_FUTURE_DAYS),
  ].sort();

  return {
    startDate,
    endDate: limits[0] < startDate ? startDate : limits[0],
    dDay: diffDays(today, startDate),
  };
};

const formatDay = (day) => {
  const low = Math.round(day.tempMin);
  const high = Math.round(day.tempMax);

  return `${getWeekdayLabel(day.date)} ${getWeatherLabel(day.code)} ${low}°~${high}°`;
};

// 비·눈이 하루라도 있으면 비 예보, 아니면 풍속 최대 ≥ 10m/s면 바람 주의(둘 다면 비 우선).
export const getWarningSuffix = (days) => {
  const hasPrecip = days.some((day) => RAIN_CODES.has(day.code) || SNOW_CODES.has(day.code));

  if (hasPrecip) {
    return " · 비 예보";
  }

  const hasStrongWind = days.some((day) => {
    return typeof day.windSpeedMax === "number" && day.windSpeedMax >= WIND_WARNING_MS;
  });

  if (hasStrongWind) {
    return " · 바람 주의";
  }

  return "";
};

// push-tokens의 locale은 예약 필드다 — 지금은 읽지 않고 문구는 한국어로만 만든다.
/**
 * NT-11 문구를 만든다. days는 요약 범위의 날(기본 토·일, ①은 여행 기간 최대 3일)이다.
 * 내용에는 앞 2일만 적고, 비·바람 경고는 범위 전체에서 판단한다.
 */
export const composeBriefing = ({source, spotName, days, dDay}) => {
  const shown = days.slice(0, 2).map(formatDay).join(" · ");
  const body = `${shown}${getWarningSuffix(days)}`;

  if (source === SpotSource.UPCOMING_TRIP) {
    const dDayLabel = dDay > 0 ? `D-${dDay}` : "D-day";

    return {title: `${dDayLabel} ${spotName}`, body};
  }

  return {title: `이번 주말 ${spotName}`, body};
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableStatus = (status) => status === 429 || status >= 500;

/**
 * 10초 제한으로 요청하고, 429·5xx·네트워크 오류(시간 초과 포함)면 1.5초 뒤 한 번만 다시 시도한다.
 * 그래도 실패하면 null을 돌려준다(던지지 않는다).
 */
const fetchWithRetry = async (url) => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const isLastAttempt = attempt === 1;

    try {
      const response = await fetch(url, {signal: AbortSignal.timeout(FORECAST_TIMEOUT_MS)});

      if (response.ok) {
        return response;
      }

      if (!isRetryableStatus(response.status) || isLastAttempt) {
        logger.warn("Open-Meteo 요청이 실패했습니다.", {status: response.status});

        return null;
      }
    } catch (error) {
      if (isLastAttempt) {
        logger.warn("Open-Meteo 요청 중 오류가 났습니다.", {error: error.message});

        return null;
      }
    }

    await wait(FORECAST_RETRY_DELAY_MS);
  }

  return null;
};

/**
 * Open-Meteo 일별 예보를 받는다. 앱 WeatherService와 같은 변수·단위(m/s)이며 타임존만 KST로 고정한다.
 * 요청·응답이 실패하면 null을 돌려준다.
 */
export const fetchDailyForecast = async ({latitude, longitude, startDate, endDate}) => {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max",
    wind_speed_unit: "ms",
    timezone: TIME_ZONE,
    start_date: startDate,
    end_date: endDate,
  });
  const response = await fetchWithRetry(`${FORECAST_URL}?${params.toString()}`);

  if (!response) {
    return null;
  }

  const json = await response.json().catch(() => null);

  if (!json || json.error) {
    logger.warn("Open-Meteo 응답이 올바르지 않습니다.", {reason: json?.reason ?? null});

    return null;
  }

  const raw = json.daily;

  if (!raw?.time) {
    return [];
  }

  const days = [];

  raw.time.forEach((date, index) => {
    const tempMax = raw.temperature_2m_max?.[index];
    const tempMin = raw.temperature_2m_min?.[index];

    if (tempMax == null || tempMin == null) {
      return;
    }

    const windSpeedMax = raw.wind_speed_10m_max?.[index];

    days.push({
      date,
      // 코드가 비면 0(맑음)으로 채우지 않는다 — 라벨은 "정보 없음"이 된다.
      code: raw.weather_code?.[index] ?? null,
      tempMax,
      tempMin,
      ...(windSpeedMax != null ? {windSpeedMax} : {}),
    });
  });

  return days;
};

const readConfig = async () => {
  const snapshot = await db.doc(CONFIG_DOC_PATH).get();
  const data = snapshot.exists ? snapshot.data() : {};
  const pickNumber = (value, fallback) => {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  };

  return {
    enabled: data.enabled !== false,
    maxTargets: Math.max(0, Math.floor(pickNumber(data.maxTargets, DEFAULT_CONFIG.maxTargets))),
  };
};

// 같은 token 값의 문서 중 남길 쪽인가: updatedAt이 늦은 쪽, 같으면 처리 순서(uid 정렬)가 뒤인 쪽, 그다음 경로.
const isPreferredTokenDoc = (candidate, current) => {
  if (candidate.updatedAtMs !== current.updatedAtMs) {
    return candidate.updatedAtMs > current.updatedAtMs;
  }

  if (candidate.uid !== current.uid) {
    return candidate.uid > current.uid;
  }

  return candidate.ref.path > current.ref.path;
};

/**
 * 같은 FCM 토큰이 잠깐 두 uid 아래에 있을 수 있다(로그아웃 삭제 실패 뒤 다른 사용자 로그인 등).
 * token 값마다 updatedAt이 가장 늦은 문서 하나만 남기고 나머지는 발송에서 뺀다(문서는 지우지 않는다).
 */
export const dedupeTokenDocs = (docs) => {
  const byToken = new Map();

  docs.forEach((doc) => {
    const current = byToken.get(doc.token);

    if (!current || isPreferredTokenDoc(doc, current)) {
      byToken.set(doc.token, doc);
    }
  });

  return {kept: [...byToken.values()], duplicates: docs.length - byToken.size};
};

/**
 * briefingEnabled 토큰을 uid별로 묶는다. collectionGroup은 같은 이름의 모든 컬렉션을 잡으므로
 * users/{uid}/push-tokens 경로인지 한 번 더 확인한다. 같은 token 값은 하나만 남긴다.
 */
const loadTargetTokens = async () => {
  const snapshot = await db.collectionGroup(PUSH_TOKEN_COLLECTION)
    .where("briefingEnabled", "==", true)
    .get();
  const docs = [];

  snapshot.docs.forEach((document) => {
    const userRef = document.ref.parent.parent;
    const token = document.get("token");

    if (!userRef || userRef.parent.id !== "users" || typeof token !== "string" || !token) {
      return;
    }

    const updatedAt = parseDate(document.get("updatedAt"));

    docs.push({
      uid: userRef.id,
      token,
      ref: document.ref,
      updatedAtMs: updatedAt ? updatedAt.getTime() : Number.NEGATIVE_INFINITY,
    });
  });

  const {kept, duplicates} = dedupeTokenDocs(docs);
  const tokensByUid = new Map();

  kept.forEach(({uid, token, ref}) => {
    const list = tokensByUid.get(uid) ?? [];

    list.push({token, ref});
    tokensByUid.set(uid, list);
  });

  return {tokensByUid, duplicateTokensSkipped: duplicates};
};

// 동시에 도는 작업 수를 limit으로 묶는다(p-limit과 같은 동작을 인라인으로).
const createLimiter = (limit) => {
  let active = 0;
  const queue = [];

  const next = () => {
    if (active >= limit || queue.length === 0) {
      return;
    }

    active += 1;

    const {task, resolve, reject} = queue.shift();

    task().then(resolve, reject).finally(() => {
      active -= 1;
      next();
    });
  };

  return (task) => new Promise((resolve, reject) => {
    queue.push({task, resolve, reject});
    next();
  });
};

/**
 * 값을 캐시한다. 진행 중인 조회는 promise로 공유하되 거절되지 않게 null로 바꾸고,
 * 결과가 null이면 캐시에서 지워 성공한 값만 남긴다.
 */
const createValueCache = () => {
  const cache = new Map();

  const get = (key, load, onHit) => {
    if (cache.has(key)) {
      onHit?.();

      return cache.get(key);
    }

    const pending = load()
      .catch(() => null)
      .then((value) => {
        if (value === null) {
          cache.delete(key);
        }

        return value;
      });

    cache.set(key, pending);

    return pending;
  };

  return {get};
};

const createRunContext = ({totalTokens}) => {
  const spotCache = createValueCache();
  const weatherCache = createValueCache();
  const forecastLimit = createLimiter(FORECAST_CONCURRENCY);
  const stats = {weatherCacheHits: 0};
  const tokenStats = {total: totalTokens, invalidArgument: 0, deletionHalted: false};

  const loadSpot = async (spotId) => {
    const snapshot = await db.collection("camp-spot").doc(spotId).get();

    if (!snapshot.exists) {
      return null;
    }

    const spot = snapshot.data();
    const latitude = spot.location?.latitude;
    const longitude = spot.location?.longitude;

    // 이름이 없으면 제목을 만들 수 없으므로 쓸 수 없는 박지로 보고 다음 순위로 내려간다.
    if (spot.status !== ACTIVE_SPOT_STATUS ||
      !spot.name ||
      typeof latitude !== "number" ||
      typeof longitude !== "number") {
      return null;
    }

    return {id: spotId, name: spot.name, latitude, longitude};
  };

  // 활성 박지만 돌려준다. 같은 실행 안에서는 쓸 수 있는 박지 문서를 한 번만 읽는다.
  const getActiveSpot = (spotId) => {
    return spotCache.get(spotId, () => loadSpot(spotId));
  };

  // 박지+기간 단위로 예보를 묶는다. 성공한 조회만 캐시하고, 실패는 null(다음 사용자가 다시 시도)이다.
  const getForecast = (spot, range) => {
    const key = `${spot.id}|${range.startDate}|${range.endDate}`;

    return weatherCache.get(
      key,
      () => forecastLimit(() => fetchDailyForecast({...spot, ...range})),
      () => {
        stats.weatherCacheHits += 1;
      },
    );
  };

  /**
   * 한 uid의 multicast 결과에서 지울 토큰을 고른다.
   * not-registered는 지우고, invalid-argument는 같은 uid의 다른 토큰이 성공했을 때만 지운다.
   * 실행 전체에서 invalid-argument가 20%를 넘으면 이후 삭제를 모두 멈춘다.
   */
  const pickDeadTokenRefs = ({tokens, responses}) => {
    const hasSuccess = responses.some((result) => result.success);
    const deadRefs = [];

    responses.forEach((result, index) => {
      const code = result.error?.code;

      if (result.success) {
        return;
      }

      if (code === INVALID_ARGUMENT_ERROR_CODE) {
        tokenStats.invalidArgument += 1;

        if (hasSuccess) {
          deadRefs.push(tokens[index].ref);
        }

        return;
      }

      if (code === NOT_REGISTERED_ERROR_CODE) {
        deadRefs.push(tokens[index].ref);
      }
    });

    if (!tokenStats.deletionHalted &&
      tokenStats.invalidArgument > tokenStats.total * INVALID_ARGUMENT_HALT_RATIO) {
      tokenStats.deletionHalted = true;
      logger.warn("invalid-argument 실패가 많아 이번 실행의 토큰 삭제를 멈춥니다.", {
        invalidArgument: tokenStats.invalidArgument,
        totalTokens: tokenStats.total,
      });
    }

    return tokenStats.deletionHalted ? [] : deadRefs;
  };

  return {getActiveSpot, getForecast, pickDeadTokenRefs, stats};
};

/**
 * NT-11 우선순위대로 박지 1곳을 고른다. 선택된 박지가 비활성·삭제면 다음 순위로 내려간다.
 */
const resolveTarget = async ({uid, runAt, context}) => {
  const [bagSnapshot, favoriteSnapshot] = await Promise.all([
    db.collection("bag")
      .where("userId", "==", uid)
      .select("location", "startDate", "endDate")
      .get(),
    db.collection("users").doc(uid).collection("camp-favorites")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get(),
  ]);
  const bags = bagSnapshot.docs.map((document) => ({id: document.id, ...document.data()}));
  const {upcomingTrip, recentTrip} = pickTripCandidates({bags, runAt});

  if (upcomingTrip) {
    const spot = await context.getActiveSpot(upcomingTrip.spotId);

    if (spot) {
      return {
        source: SpotSource.UPCOMING_TRIP,
        spot,
        bagId: upcomingTrip.id,
        range: getTripRange({trip: upcomingTrip, runAt}),
      };
    }
  }

  const weekend = getUpcomingWeekend(runAt);
  const favoriteId = favoriteSnapshot.docs[0]?.id;

  if (favoriteId) {
    const spot = await context.getActiveSpot(favoriteId);

    if (spot) {
      return {source: SpotSource.FAVORITE, spot, range: weekend};
    }
  }

  if (recentTrip) {
    const spot = await context.getActiveSpot(recentTrip.spotId);

    if (spot) {
      return {source: SpotSource.RECENT_TRIP, spot, range: weekend};
    }
  }

  return null;
};

const buildMessage = ({target, briefing}) => {
  const route = target.source === SpotSource.UPCOMING_TRIP ?
    `/bag/${target.bagId}` :
    `/camp-site/${target.spot.id}`;

  return {
    notification: {title: briefing.title, body: briefing.body},
    data: {type: NOTIFICATION_TYPE, route},
    apns: {payload: {aps: {sound: "default"}}},
    android: {priority: "high", notification: {sound: "default"}},
  };
};

/**
 * 사용자 1명을 처리한다. 반환: {status: "sent"|"failed"|"skipped", reason?}.
 */
const processUser = async ({uid, tokens, runAt, context, dryRun}) => {
  const target = await resolveTarget({uid, runAt, context});

  if (!target) {
    return {status: "skipped", reason: SkipReason.NO_SPOT};
  }

  const forecast = await context.getForecast(target.spot, target.range) ?? [];
  const days = forecast
    .filter((day) => day.date >= target.range.startDate && day.date <= target.range.endDate);

  if (days.length === 0) {
    return {status: "skipped", reason: SkipReason.NO_WEATHER};
  }

  const briefing = composeBriefing({
    source: target.source,
    spotName: target.spot.name,
    days,
    dDay: target.range.dDay,
  });
  const message = buildMessage({target, briefing});

  if (dryRun) {
    logger.info("[DRY-RUN] 주말 브리핑 미리보기", {
      uid,
      source: target.source,
      tokenCount: tokens.length,
      ...message.notification,
      ...message.data,
    });

    return {status: "sent"};
  }

  const response = await admin.messaging().sendEachForMulticast({
    ...message,
    tokens: tokens.map((item) => item.token),
  });
  // 지우지 않은 invalid-argument 토큰은 남겨 두고 실패로만 센다(성공 토큰이 없으면 uid는 failed).
  const deadRefs = context.pickDeadTokenRefs({tokens, responses: response.responses});

  if (deadRefs.length > 0) {
    await Promise.all(deadRefs.map((ref) => ref.delete().catch((error) => {
      logger.warn("만료 토큰 문서 삭제에 실패했습니다.", {path: ref.path, error: error.message});
    })));
  }

  return {status: response.successCount > 0 ? "sent" : "failed"};
};

/**
 * 한 회차를 실행한다. 같은 주 재실행은 run 문서의 sentUids를 건너뛰어 멱등하다.
 * 카운터는 increment로 누적하고, targets·firstRanAt은 문서에 없을 때 한 번만 쓴다.
 * dryRun이면 문구만 만들어 로그로 남기고 발송·토큰 삭제·run 문서 쓰기를 하지 않는다.
 */
export const runWeekendBriefing = async ({runAt, dryRun = false}) => {
  const {FieldValue} = admin.firestore;
  const weekId = getKstIsoWeekId(runAt);
  const runLogRef = db.collection(RUN_LOG_COLLECTION).doc(weekId);
  const ranAt = new Date().toISOString();
  const config = await readConfig();
  const runSnapshot = await runLogRef.get();
  const runData = runSnapshot.exists ? runSnapshot.data() : {};
  const alreadySent = new Set(runData.sentUids ?? []);
  // 처음 쓰는 merge에만 실을 필드(targets·firstRanAt·duplicateTokensSkipped). 한 번 실으면 비운다.
  let onceFields = runData.firstRanAt ? {} : {firstRanAt: ranAt};
  const writeRun = async (fields) => {
    if (dryRun) {
      return;
    }

    await runLogRef.set({weekId, ranAt, ...onceFields, ...fields}, {merge: true});
    onceFields = {};
  };

  // 중단 스위치: 이미 발송된 주의 status를 덮지 않도록 lastSkip만 남긴다.
  if (!config.enabled) {
    await writeRun({lastSkip: {at: ranAt, reason: RunSkipReason.DISABLED}});

    return {weekId, dryRun, skipped: RunSkipReason.DISABLED};
  }

  const {tokensByUid, duplicateTokensSkipped} = await loadTargetTokens();

  if (duplicateTokensSkipped > 0) {
    logger.warn("여러 uid에 같은 FCM 토큰이 있어 중복을 발송에서 뺐습니다.", {
      weekId,
      duplicateTokensSkipped,
    });
  }

  // 이번 실행에서 처음 쓰는 merge에 한 번만 더한다.
  onceFields = {
    ...onceFields,
    duplicateTokensSkipped: FieldValue.increment(duplicateTokensSkipped),
  };

  const pendingUids = [...tokensByUid.keys()]
    .filter((uid) => !alreadySent.has(uid))
    .sort();
  const remaining = Math.max(0, config.maxTargets - alreadySent.size);
  const targetUids = pendingUids.slice(0, remaining);

  if (pendingUids.length > remaining) {
    logger.warn("maxTargets를 넘어 이번 회차에서 일부 사용자를 건너뜁니다.", {
      weekId,
      maxTargets: config.maxTargets,
      alreadySent: alreadySent.size,
      overflow: pendingUids.length - remaining,
    });
  }

  if (runData.targets == null) {
    onceFields = {...onceFields, targets: targetUids.length};
  }

  const counts = {sent: 0, skippedNoSpot: 0, skippedNoWeather: 0, failed: 0};
  const totalTokens = targetUids.reduce((sum, uid) => sum + tokensByUid.get(uid).length, 0);
  const context = createRunContext({totalTokens});
  let reportedCacheHits = 0;

  for (let offset = 0; offset < targetUids.length; offset += USER_CONCURRENCY) {
    const chunk = targetUids.slice(offset, offset + USER_CONCURRENCY);
    const results = await Promise.all(chunk.map(async (uid) => {
      try {
        return await processUser({
          uid,
          tokens: tokensByUid.get(uid),
          runAt,
          context,
          dryRun,
        });
      } catch (error) {
        logger.error("주말 브리핑 사용자 처리에 실패했습니다.", {uid, error: error.message});

        return {status: "failed"};
      }
    }));
    const sentInChunk = [];
    const chunkCounts = {sent: 0, skippedNoSpot: 0, skippedNoWeather: 0, failed: 0};

    results.forEach((result, index) => {
      if (result.status === "sent") {
        chunkCounts.sent += 1;
        sentInChunk.push(chunk[index]);
      } else if (result.reason === SkipReason.NO_SPOT) {
        chunkCounts.skippedNoSpot += 1;
      } else if (result.reason === SkipReason.NO_WEATHER) {
        chunkCounts.skippedNoWeather += 1;
      } else {
        chunkCounts.failed += 1;
      }
    });

    Object.keys(counts).forEach((key) => {
      counts[key] += chunkCounts[key];
    });

    const cacheHitsDelta = context.stats.weatherCacheHits - reportedCacheHits;

    reportedCacheHits = context.stats.weatherCacheHits;

    // 중간에 시간 초과로 끊겨도 재시도가 이미 보낸 사람을 건너뛰도록 묶음마다 기록한다.
    await writeRun({
      ...Object.fromEntries(Object.entries(chunkCounts).map(([key, value]) => {
        return [key, FieldValue.increment(value)];
      })),
      spotWeatherCacheHits: FieldValue.increment(cacheHitsDelta),
      ...(sentInChunk.length > 0 ? {
        status: RunStatus.PUBLISHED,
        sentUids: FieldValue.arrayUnion(...sentInChunk),
      } : {}),
    });
  }

  const hasSentEver = counts.sent > 0 || alreadySent.size > 0;
  const status = hasSentEver ? RunStatus.PUBLISHED : RunStatus.EMPTY;

  // ranAt은 매 실행 갱신한다. 보낸 적이 없는 주만 empty로 적는다(published는 묶음 기록에서 이미 썼다).
  await writeRun(hasSentEver ? {} : {status});

  return {
    weekId,
    dryRun,
    status,
    targets: targetUids.length,
    ...counts,
    spotWeatherCacheHits: context.stats.weatherCacheHits,
  };
};

export const sendWeekendBriefing = onSchedule({
  schedule: SCHEDULE,
  timeZone: TIME_ZONE,
  region: REGION,
  timeoutSeconds: 540,
  memory: "512MiB",
  maxInstances: 1,
  concurrency: 1,
  retryCount: 2,
}, async (event) => {
  // 수동 실행(functions:shell 등)은 scheduleTime이 없을 수 있어 현재 시각으로 대신한다.
  const scheduledAt = event?.scheduleTime ? new Date(event.scheduleTime) : null;
  const hasScheduleTime = scheduledAt !== null && !Number.isNaN(scheduledAt.getTime());
  const runAt = hasScheduleTime ? scheduledAt : new Date();
  const dryRun = process.env[DRY_RUN_ENV] === "1";
  const result = await runWeekendBriefing({runAt, dryRun});

  logger.info("주말 날씨 브리핑 실행을 마쳤습니다.", result);
});

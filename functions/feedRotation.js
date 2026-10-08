import admin from "firebase-admin";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions";

const REGION = "asia-northeast3";
const TIME_ZONE = "Asia/Seoul";
const SCHEDULE = "every thursday 07:00";
const FEED_COLLECTION = "feed-content";
const CONFIG_DOC_PATH = "config/feedRotation";
const RUN_LOG_COLLECTION = "feed-rotation-runs";
const SPOT_INTRO_TYPE = "spot_intro";
const PUBLISH_PER_RUN = 2;
const LIVE_LIMIT = 5;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// 앱 DM-27 FeedRotationState와 같은 값이다.
const RotationState = Object.freeze({
  QUEUED: "queued",
  LIVE: "live",
  RETIRED: "retired",
});

const RunStatus = Object.freeze({
  PUBLISHED: "published",
  QUEUE_EMPTY: "queue_empty",
});

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * KST 달력 기준 ISO 8601 주 ID(예: 2026-W42)를 만든다.
 * 같은 회차의 재시도는 같은 scheduleTime을 받으므로 같은 ID가 나온다.
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

const getQueueOrder = (item) => {
  return typeof item.queueOrder === "number" ? item.queueOrder : Infinity;
};

const compareQueue = (a, b) => {
  const orderDiff = getQueueOrder(a) - getQueueOrder(b);

  if (orderDiff !== 0 && !Number.isNaN(orderDiff)) {
    return orderDiff;
  }

  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

// 계약은 ISO string이지만 Timestamp가 섞여 들어와도 정렬이 깨지지 않게 정규화한다.
const toPublishedAtString = (value) => {
  if (value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  return typeof value === "string" ? value : "";
};

const comparePublishedAtDesc = (a, b) => {
  const left = toPublishedAtString(a.publishedAt);
  const right = toPublishedAtString(b.publishedAt);

  return left < right ? 1 : left > right ? -1 : 0;
};

/**
 * 한 회차의 발행·내림 대상을 계산한다(쓰기 없음).
 * queued: rotationState == queued 문서, live: published == true 문서.
 * 둘 다 {id, ...data} 형태이며 spot_intro가 아닌 문서는 여기서 걸러진다.
 */
export const planRotation = ({queued, live, runAt}) => {
  const candidates = queued
    .filter((item) => item.type === SPOT_INTRO_TYPE && item.published !== true)
    .sort(compareQueue);

  if (candidates.length === 0) {
    return {status: RunStatus.QUEUE_EMPTY, publish: [], retire: [], queueRemaining: 0};
  }

  const publish = candidates.slice(0, PUBLISH_PER_RUN).map((item, index) => ({
    id: item.id,
    publishedAt: new Date(runAt.getTime() - index * 1000).toISOString(),
  }));
  const publishIds = new Set(publish.map((item) => item.id));
  const liveAfterPublish = [
    ...live.filter((item) => {
      return item.type === SPOT_INTRO_TYPE && !publishIds.has(item.id);
    }),
    ...publish,
  ].sort(comparePublishedAtDesc);
  const retire = liveAfterPublish.slice(LIVE_LIMIT).map((item) => ({id: item.id}));

  return {
    status: RunStatus.PUBLISHED,
    publish,
    retire,
    queueRemaining: candidates.length - publish.length,
  };
};

const toItems = (snapshot) => {
  return snapshot.docs.map((document) => ({id: document.id, ...document.data()}));
};

/**
 * 가드 확인·조회·발행·내림·실행 기록을 한 트랜잭션으로 처리한다.
 * 같은 주 ID가 이미 처리됐으면 아무것도 쓰지 않는다.
 */
export const runFeedRotation = async (runAt) => {
  const weekId = getKstIsoWeekId(runAt);
  const feedCollection = db.collection(FEED_COLLECTION);
  const configRef = db.doc(CONFIG_DOC_PATH);
  const runLogRef = db.collection(RUN_LOG_COLLECTION).doc(weekId);

  return db.runTransaction(async (transaction) => {
    const configSnapshot = await transaction.get(configRef);

    if (configSnapshot.exists && configSnapshot.get("lastRunWeekId") === weekId) {
      return {weekId, skipped: true};
    }

    const queuedSnapshot = await transaction.get(
      feedCollection.where("rotationState", "==", RotationState.QUEUED),
    );
    const liveSnapshot = await transaction.get(
      feedCollection.where("published", "==", true),
    );
    queuedSnapshot.docs
      .filter((document) => document.get("published") === true)
      .forEach((document) => {
        logger.warn("발행 중인데 rotationState가 queued인 문서가 있어 후보에서 뺍니다.", {
          id: document.id,
        });
      });

    const plan = planRotation({
      queued: toItems(queuedSnapshot),
      live: toItems(liveSnapshot),
      runAt,
    });
    const ranAt = runAt.toISOString();

    plan.publish.forEach((item) => {
      transaction.update(feedCollection.doc(item.id), {
        published: true,
        rotationState: RotationState.LIVE,
        publishedAt: item.publishedAt,
      });
    });

    plan.retire.forEach((item) => {
      transaction.update(feedCollection.doc(item.id), {
        published: false,
        rotationState: RotationState.RETIRED,
        retiredAt: ranAt,
      });
    });

    const publishedIds = plan.publish.map((item) => item.id);
    const retiredIds = plan.retire.map((item) => item.id);

    transaction.set(configRef, {
      lastRunWeekId: weekId,
      lastRunAt: ranAt,
      lastPublishedIds: publishedIds,
      lastRetiredIds: retiredIds,
      queueRemaining: plan.queueRemaining,
    }, {merge: true});
    transaction.set(runLogRef, {
      weekId,
      ranAt,
      status: plan.status,
      publishedIds,
      retiredIds,
      queueRemaining: plan.queueRemaining,
    });

    return {
      weekId,
      skipped: false,
      status: plan.status,
      publishedIds,
      retiredIds,
      queueRemaining: plan.queueRemaining,
    };
  });
};

export const rotateFeedContent = onSchedule({
  schedule: SCHEDULE,
  timeZone: TIME_ZONE,
  region: REGION,
  timeoutSeconds: 120,
  memory: "256MiB",
  maxInstances: 1,
  retryCount: 3,
}, async (event) => {
  const scheduledAt = event.scheduleTime ? new Date(event.scheduleTime) : new Date();
  const runAt = Number.isNaN(scheduledAt.getTime()) ? new Date() : scheduledAt;
  const result = await runFeedRotation(runAt);

  if (result.skipped) {
    logger.info("이번 주 추천 박지 교체는 이미 처리되어 건너뜁니다.", {weekId: result.weekId});

    return;
  }

  if (result.status === RunStatus.QUEUE_EMPTY) {
    logger.warn("추천 박지 대기열이 비어 이번 주 교체를 하지 않았습니다.", result);

    return;
  }

  logger.info("추천 박지 주간 교체를 완료했습니다.", result);
});

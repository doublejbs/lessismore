import {Buffer} from "node:buffer";
import crypto from "node:crypto";
import admin from "firebase-admin";
import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as functionsV1 from "firebase-functions/v1";
import {logger} from "firebase-functions";

const REGION = "asia-northeast3";
const MAX_INSTANCES = 10;

// RevenueCat 익명 사용자 id 접두사. 계정에 묶이지 않은 구매라 기록하지 않는다(SUB-3).
const ANONYMOUS_ID_PREFIX = "$RCAnonymousID:";

// 환불로 인한 CANCELLATION 의 cancel_reason. 이 경우 만료를 기다리지 않고 즉시 끈다.
const REFUND_CANCEL_REASON = "CUSTOMER_SUPPORT";

// 활성으로 만드는 이벤트(SUB-6).
const ACTIVATING_EVENT_TYPES = [
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
];

// RevenueCat 웹훅 설정의 Authorization 헤더 값. Secret Manager 에만 둔다(SUB-6).
const REVENUECAT_WEBHOOK_AUTH = defineSecret("REVENUECAT_WEBHOOK_AUTH");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const {FieldValue, Timestamp} = admin.firestore;

// Firebase Auth 에 uid 가 없을 때 admin SDK 가 던지는 코드.
const USER_NOT_FOUND_CODE = "auth/user-not-found";

const getSubscriptionRef = (uid) => db.collection("subscriptions").doc(uid);

const readString = (value) => (typeof value === "string" ? value : "");

const readFiniteNumber = (value) =>
  (typeof value === "number" && Number.isFinite(value) ? value : null);

// Firestore Timestamp·Date·숫자(ms) 어느 쪽이든 ms 로 읽는다. 읽을 수 없으면 null.
const readMillis = (value) => {
  if (value && typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return readFiniteNumber(value);
};

const toTimestampOrNull = (millis) =>
  (millis === null ? null : Timestamp.fromMillis(millis));

const isAnonymousId = (uid) => uid.startsWith(ANONYMOUS_ID_PREFIX);

// 문서 id 로 쓸 수 있는 계정 uid 인지 본다. 익명 id·빈 값·경로 문자는 건너뛴다.
const isRecordableUid = (uid) =>
  uid.length > 0 && !isAnonymousId(uid) && !uid.includes("/");

const readUidList = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(readString).filter(isRecordableUid);
};

/**
 * TRANSFER 이벤트에서 uid 가 넘겨준 쪽(from)인지 받은 쪽(to)인지 판단한다.
 * 양쪽에 모두 있으면 받은 쪽으로 본다 — 권한이 결국 그 uid 에 남기 때문이다.
 */
const readTransferSide = (event, uid) => {
  if (readUidList(event.transferred_to).includes(uid)) {
    return "to";
  }

  if (readUidList(event.transferred_from).includes(uid)) {
    return "from";
  }

  return null;
};

/**
 * 이벤트 타입별로 active·willRenew·billingIssue 를 정한다(SUB-6).
 * 반영하지 않는 이벤트면 null 을 돌려준다.
 */
const resolveEntitlementState = (existing, event, nowMs, uid) => {
  const type = readString(event.type);
  const expiresMs = readFiniteNumber(event.expiration_at_ms) ??
    readMillis(existing.expiresAt);
  const previousWillRenew = typeof existing.willRenew === "boolean" ?
    existing.willRenew :
    true;
  const previousBillingIssue = existing.billingIssue === true;

  if (ACTIVATING_EVENT_TYPES.includes(type)) {
    return {active: true, willRenew: true, billingIssue: false};
  }

  if (type === "CANCELLATION") {
    const isRefund = readString(event.cancel_reason) === REFUND_CANCEL_REASON;
    const isExpired = expiresMs !== null && expiresMs <= nowMs;
    // 만료 시각을 모르면 이전 상태를 잇는다 — 해지 예약은 권한을 바로 끄지 않는다.
    const stillActive = expiresMs === null ?
      existing.active !== false :
      !isExpired;

    return {
      active: !isRefund && stillActive,
      willRenew: false,
      billingIssue: previousBillingIssue,
    };
  }

  if (type === "EXPIRATION") {
    return {active: false, willRenew: false, billingIssue: false};
  }

  // 스토어가 기간을 늘려 줬다 — 새 만료 시각은 expiresAt 에 반영된다.
  if (type === "SUBSCRIPTION_EXTENDED") {
    return {
      active: true,
      willRenew: previousWillRenew,
      billingIssue: previousBillingIssue,
    };
  }

  if (type === "BILLING_ISSUE") {
    return {active: true, willRenew: previousWillRenew, billingIssue: true};
  }

  if (type === "TRANSFER") {
    const side = readTransferSide(event, uid);

    if (side === "to") {
      return {
        active: true,
        willRenew: previousWillRenew,
        billingIssue: previousBillingIssue,
      };
    }

    // 기록이 없던 uid 에서 넘어간 경우 끌 것이 없다 — 빈 문서를 새로 만들지 않는다.
    if (side === "from" && Object.keys(existing).length > 0) {
      return {active: false, willRenew: false, billingIssue: false};
    }
  }

  return null;
};

/**
 * RevenueCat 이벤트 하나를 기존 `subscriptions/{uid}` 문서에 반영한 결과를 만든다(DM-31).
 * Firestore 를 읽거나 쓰지 않는 순수 함수다 — 트랜잭션 안에서 호출하고 결과만 쓴다.
 *
 * @param {object|null} existingDoc 저장된 문서 데이터(없으면 null)
 * @param {object} event RevenueCat 웹훅 본문의 `event`
 * @param {number} nowMs 현재 시각(ms). 해지 이벤트의 만료 여부 판단에 쓴다.
 * @param {string} [uid] 쓰는 문서의 uid. TRANSFER 에서 넘긴 쪽/받은 쪽 판단에만 쓴다.
 * @return {{skip: string}|{data: object}} 건너뛸 이유 또는 set 할 문서 전체
 */
export const applyRevenueCatEvent = (existingDoc, event, nowMs, uid = "") => {
  const existing = existingDoc || {};
  const eventId = readString(event?.id);
  const eventType = readString(event?.type);

  if (!eventId || !eventType) {
    return {skip: "malformed"};
  }

  if (readString(existing.lastEventId) === eventId) {
    return {skip: "duplicate"};
  }

  // 이벤트 시각이 없으면 받은 시각으로 본다(RevenueCat 은 늘 보내지만 방어한다).
  const eventAtMs = readFiniteNumber(event.event_timestamp_ms) ?? nowMs;
  const lastEventAtMs = readMillis(existing.lastEventAt);

  if (lastEventAtMs !== null && lastEventAtMs > eventAtMs) {
    return {skip: "stale"};
  }

  const state = resolveEntitlementState(existing, event, nowMs, uid);

  if (!state) {
    return {skip: "unhandled"};
  }

  const eventExpiresMs = readFiniteNumber(event.expiration_at_ms);
  const expiresAt = eventExpiresMs === null ?
    existing.expiresAt ?? null :
    toTimestampOrNull(eventExpiresMs);
  const data = {
    active: state.active,
    productId: readString(event.product_id) || readString(existing.productId),
    store: readString(event.store).toLowerCase() ||
      readString(existing.store),
    environment: readString(event.environment).toLowerCase() ||
      readString(existing.environment),
    willRenew: state.willRenew,
    billingIssue: state.billingIssue,
    expiresAt,
    lastEventType: eventType,
    lastEventId: eventId,
    lastEventAt: Timestamp.fromMillis(eventAtMs),
    updatedAt: FieldValue.serverTimestamp(),
  };

  // 첫 구매 시각은 처음 알게 된 값을 유지한다. 모르면 비워 두고 다음 이벤트에서 채운다.
  const purchasedAtMs = readFiniteNumber(event.purchased_at_ms);

  if (existing.originalPurchasedAt) {
    data.originalPurchasedAt = existing.originalPurchasedAt;
  } else if (purchasedAtMs !== null) {
    data.originalPurchasedAt = Timestamp.fromMillis(purchasedAtMs);
  }

  return {data};
};

/**
 * 이벤트가 쓰는 문서의 uid 목록. TRANSFER 는 양쪽 uid 전부, 나머지는 app_user_id 하나다.
 * 익명 id 는 뺀다(SUB-6).
 */
const resolveTargetUids = (event) => {
  if (readString(event.type) === "TRANSFER") {
    const uids = [
      ...readUidList(event.transferred_from),
      ...readUidList(event.transferred_to),
    ];

    return [...new Set(uids)];
  }

  const appUserId = readString(event.app_user_id);

  return isRecordableUid(appUserId) ? [appUserId] : [];
};

/**
 * uid 가 Firebase Auth 에 아직 있는지 본다. 없으면 false, 그 밖의 오류는 던진다.
 */
const hasAuthUser = async (uid) => {
  try {
    await admin.auth().getUser(uid);

    return true;
  } catch (error) {
    if (error?.code === USER_NOT_FOUND_CODE) {
      return false;
    }

    throw error;
  }
};

/**
 * 한 uid 문서에 이벤트를 트랜잭션으로 반영한다. 멱등·순서 판단도 트랜잭션 안에서 한다.
 */
const writeSubscriptionEvent = async (uid, event) => {
  // 탈퇴한 계정이면 쓰지 않는다 — 늦게 온 이벤트가 지운 문서를 되살리지 않게(SUB-6·7).
  if (!(await hasAuthUser(uid))) {
    return "user_not_found";
  }

  const ref = getSubscriptionRef(uid);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const existingDoc = snapshot.exists ? snapshot.data() || {} : null;
    const result = applyRevenueCatEvent(existingDoc, event, Date.now(), uid);

    if (result.data) {
      transaction.set(ref, result.data);

      return "written";
    }

    return result.skip;
  });
};

// 두 값을 해시해 같은 길이로 맞춘 뒤 비교한다 — 길이·내용이 시간으로 새지 않는다.
const isAuthorized = (header, secret) => {
  const headerDigest = crypto.createHash("sha256").update(header).digest();
  const secretDigest = crypto.createHash("sha256").update(secret).digest();

  return crypto.timingSafeEqual(headerDigest, secretDigest);
};

const readRequestBody = (req) => {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  const raw = req.rawBody ? req.rawBody.toString("utf8") : "";

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

export const revenuecatWebhook = onRequest({
  region: REGION,
  secrets: [REVENUECAT_WEBHOOK_AUTH],
  maxInstances: MAX_INSTANCES,
}, async (req, res) => {
  if (req.method !== "POST") {
    res.set("Allow", "POST");
    res.status(405).send("Method Not Allowed");

    return;
  }

  const secret = REVENUECAT_WEBHOOK_AUTH.value();

  if (!secret) {
    logger.error("REVENUECAT_WEBHOOK_AUTH 시크릿이 비어 있습니다.");
    res.status(500).send("Server Misconfigured");

    return;
  }

  if (!isAuthorized(readString(req.get("Authorization")), secret)) {
    logger.warn("RevenueCat 웹훅 인증에 실패했습니다.");
    res.status(401).send("Unauthorized");

    return;
  }

  const body = readRequestBody(req);
  const event = body?.event;

  if (!event || typeof event !== "object" ||
    !readString(event.id) || !readString(event.type)) {
    logger.warn("RevenueCat 웹훅 본문이 올바르지 않습니다.");
    res.status(400).send("Bad Request");

    return;
  }

  const eventId = event.id;
  const eventType = event.type;

  // 대시보드의 테스트 전송은 인증·본문 확인만 하고 쓰지 않는다.
  if (eventType === "TEST") {
    logger.info("RevenueCat 테스트 웹훅을 받았습니다.", {eventId});
    res.status(200).send("OK");

    return;
  }

  const uids = resolveTargetUids(event);

  if (uids.length === 0) {
    logger.info("기록할 계정 uid 가 없어 건너뜁니다.", {eventId, eventType});
    res.status(200).send("OK");

    return;
  }

  try {
    // TRANSFER 는 uid 마다 따로 쓴다. 중간에 실패해 재전송돼도 이미 쓴 문서는
    // lastEventId 로 건너뛰므로 결과가 같다.
    const results = {};

    for (const uid of uids) {
      results[uid] = await writeSubscriptionEvent(uid, event);
    }

    logger.info("RevenueCat 이벤트를 반영했습니다.", {
      eventId,
      eventType,
      results,
    });
    res.status(200).send("OK");
  } catch (error) {
    // 일시 오류는 5xx 로 돌려 RevenueCat 이 재시도하게 한다(SUB-6).
    logger.error("RevenueCat 이벤트 반영에 실패했습니다.", {
      eventId,
      eventType,
      error: error?.message,
    });
    res.status(500).send("Internal Error");
  }
});

export const onSubscriptionUserDeleted = functionsV1
  .region(REGION)
  .runWith({
    failurePolicy: {retry: {}},
    maxInstances: MAX_INSTANCES,
  })
  .auth.user().onDelete(async (user) => {
    // 없는 문서 삭제도 성공이라 재시도에 안전하다(SUB-7).
    await getSubscriptionRef(user.uid).delete();

    logger.info("구독 기록 회원 탈퇴 정리를 완료했습니다.");
  });

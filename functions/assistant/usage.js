import admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";

// 앱 레포 specs/Assistant.md AS-9(사용량 한도), specs/DataModel.md DM-39.
// assistant-usage/{uid}:
//   { day: "YYYY-MM-DD"(KST), count, toolTurnCount, updatedAt }.
// - count: 사용자 발화(userText) 수, 하루 20회.
// - toolTurnCount: 쓰기 결과 이어 보내기(toolResults) 수, 하루 60회 — 조작한
//   history로 발화 한도를 우회해 모델을 부르는 것을 막는 보조 상한이다.
export const DAILY_LIMIT = 20;
export const DAILY_TOOL_TURN_LIMIT = 60;

export const UsageKind = Object.freeze({
  USER_TEXT: "user_text",
  TOOL_RESULTS: "tool_results",
});

const USAGE_COLLECTION = "assistant-usage";
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const MESSAGE_LIMIT_MESSAGE = "오늘 대화를 다 썼어요. 내일 다시 계획해 보세요.";
const TOOL_TURN_LIMIT_MESSAGE = "요청이 너무 잦아요. 잠시 후 다시 시도해 주세요";

// resource-exhausted details.kind — 앱이 한도 카드(message)와 일시 오류(toolTurn)를
// 구분한다.
export const LimitKind = Object.freeze({
  MESSAGE: "message",
  TOOL_TURN: "toolTurn",
});

const kstDay = () =>
  new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10);

const readCount = (data, field, today) =>
  (data?.day === today && Number.isFinite(data?.[field]) ? data[field] : 0);

/**
 * 요청 1회를 센다(모델 호출 전, 트랜잭션 하나·문서 하나).
 * 해당 한도에 이미 닿았으면 resource-exhausted를 던지고 쓰지 않는다.
 * @param {string} uid
 * @param {string} kind UsageKind
 * @return {Promise<number>} 오늘 남은 발화 수
 */
export const consumeDailyUsage = async (uid, kind) => {
  const db = admin.firestore();
  const ref = db.collection(USAGE_COLLECTION).doc(uid);
  const today = kstDay();

  return db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data();
    let count = readCount(data, "count", today);
    let toolTurnCount = readCount(data, "toolTurnCount", today);

    if (kind === UsageKind.USER_TEXT) {
      if (count >= DAILY_LIMIT) {
        throw new HttpsError("resource-exhausted", MESSAGE_LIMIT_MESSAGE,
            {kind: LimitKind.MESSAGE, remaining: 0});
      }

      count += 1;
    } else {
      if (toolTurnCount >= DAILY_TOOL_TURN_LIMIT) {
        throw new HttpsError("resource-exhausted", TOOL_TURN_LIMIT_MESSAGE, {
          kind: LimitKind.TOOL_TURN,
          remaining: Math.max(0, DAILY_LIMIT - count),
        });
      }

      toolTurnCount += 1;
    }

    tx.set(ref, {
      day: today,
      count,
      toolTurnCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return Math.max(0, DAILY_LIMIT - count);
  });
};

/**
 * 세지 않고 오늘 남은 발화 수만 읽는다(창고가 비어 모델을 부르지 않는 모드 호출 —
 * AS-4 "한도 미차감"). 쓰지 않는다.
 * @param {string} uid
 * @return {Promise<number>}
 */
export const peekDailyUsage = async (uid) => {
  const snap = await admin.firestore()
      .collection(USAGE_COLLECTION).doc(uid).get();

  return Math.max(0, DAILY_LIMIT - readCount(snap.data(), "count", kstDay()));
};

/**
 * 읽기 전에 미리 한도를 본다 — 이미 소진했으면 resource-exhausted를 던진다.
 * 최종 판정은 consumeDailyUsage 트랜잭션이 한다(이건 불필요한 읽기 절약용).
 * @param {string} uid
 * @return {Promise<number>} 오늘 남은 발화 수(1 이상)
 */
export const assertUsageAvailable = async (uid) => {
  const remaining = await peekDailyUsage(uid);

  if (remaining <= 0) {
    throw new HttpsError("resource-exhausted", MESSAGE_LIMIT_MESSAGE,
        {kind: LimitKind.MESSAGE, remaining: 0});
  }

  return remaining;
};

// KST 날짜 변환 공용 모듈 — weekendBriefing·tripAssistant가 함께 쓴다.
// 앱은 bag.startDate/endDate를 dayjs.toISOString()(UTC)으로 쓰므로 KST 자정이
// 전날 15:00Z로 저장된다. 날짜 비교·표시는 항상 KST 달력 날짜로 바꿔서 한다.

export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// Date → KST 달력 날짜 문자열(YYYY-MM-DD).
export const toKstDateString = (date) =>
  new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);

const toIsoString = (value) => {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  return null;
};

/**
 * ISO 문자열·Firestore Timestamp를 Date로 읽는다. 없거나 읽을 수 없으면 null.
 * @param {*} value
 * @return {Date|null}
 */
export const parseDate = (value) => {
  const iso = toIsoString(value);

  if (!iso) {
    return null;
  }

  const time = Date.parse(iso);

  return Number.isNaN(time) ? null : new Date(time);
};

/**
 * 저장된 날짜 값(ISO 문자열·Timestamp·"YYYY-MM-DD")을 KST 날짜 문자열로 바꾼다.
 * 없거나 읽을 수 없으면 빈 문자열.
 * @param {*} value
 * @return {string}
 */
export const toKstDate = (value) => {
  const date = parseDate(value);

  return date ? toKstDateString(date) : "";
};

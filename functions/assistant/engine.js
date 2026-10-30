import {Buffer} from "node:buffer";
import {HttpsError} from "firebase-functions/v2/https";
import {REFUSAL_TEXT} from "./prompt.js";
import {isWriteTool} from "./tools.js";

// 여행 도우미 턴 루프(공급자 공통) — 앱 레포 specs/Assistant.md AS-1·AS-4.
// 읽기 도구는 서버에서 실행하며 루프를 계속 돌고, 쓰기 도구가 나오면 턴을 끝내
// pendingActions로 돌려준다. 기록은 앱이 들고 다니는 공급자 원형 배열이다.

const LOCALES = ["ko", "en", "ja"];
// history + toolResults + userText 직렬화 전체 상한.
const MAX_REQUEST_BYTES = 200 * 1024;
// toolResults 결과 하나(content)의 직렬화 상한.
const MAX_TOOL_RESULT_BYTES = 8 * 1024;
const MAX_HISTORY_MESSAGES = 80;
const MAX_USER_TEXT = 2000;
const MAX_TOOL_RESULTS = 20;
const MAX_READS_PER_TURN = 8;
// 읽기 상한 오류 뒤에도 모델이 끝내지 않는 경우를 막는 모델 호출 상한.
const MAX_MODEL_CALLS_PER_TURN = 12;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS_KO = "일월화수목금토";
const DAY_MS = 24 * 60 * 60 * 1000;
const CALENDAR_DAYS = 21;
const READ_DEADLINE_ERROR = {error: "시간이 부족해 읽기를 건너뜁니다"};
const TOOL_LIMIT_ERROR = {
  error: "이 도구의 호출 상한에 도달했습니다. 지금 아는 정보로 답하세요.",
};
const READ_LIMIT_ERROR = {
  error: "이 턴의 읽기 횟수 상한에 도달했습니다. 지금 아는 정보로 답하세요.",
};
const PROVIDER_CHANGED_MESSAGE = "공급자가 바뀌었어요. 새 대화를 시작해 주세요";
// 남은 시간이 이보다 적으면 모델을 새로 부르지 않는다(응답이 잘려 기록이 깨지지 않게).
const MIN_MODEL_CALL_MS = 5000;

const invalid = (message) => new HttpsError("invalid-argument", message);

const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const isValidDate = (s) => typeof s === "string" && DATE_RE.test(s) &&
  !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) &&
  new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);

const byteLengthOf = (value) =>
  Buffer.byteLength(JSON.stringify(value) ?? "", "utf8");

/**
 * 요청 data를 검증해 정규화한다(AS-1 입력 검증). 실패하면 HttpsError.
 * 사용량을 세기 전에 부른다 — 검증 실패는 세지 않는다.
 * @param {object} data request.data
 * @param {object} options
 * @param {string} options.serverProvider 서버 설정 공급자
 * @param {string[]} options.providerNames 지원 공급자 이름
 * @param {function(object): boolean} options.isValidHistoryMessage
 *   공급자별 기록 메시지 화이트리스트 검사
 * @return {object}
 */
export const validateRequest = (data, {
  serverProvider,
  providerNames,
  isValidHistoryMessage,
}) => {
  if (!isPlainObject(data)) {
    throw invalid("요청 형식이 올바르지 않습니다.");
  }

  const {provider, history, userText, toolResults, locale, today} = data;
  const context = data.context ?? {};

  if (!Array.isArray(history)) {
    throw invalid("history는 배열이어야 합니다.");
  }

  if (history.length > MAX_HISTORY_MESSAGES) {
    throw invalid("대화가 너무 깁니다.");
  }

  if (byteLengthOf({history, toolResults, userText}) > MAX_REQUEST_BYTES) {
    throw invalid("대화가 너무 깁니다.");
  }

  if (provider !== undefined && !providerNames.includes(provider)) {
    throw invalid("provider 값이 올바르지 않습니다.");
  }

  // 기록 원형이 공급자마다 달라 진행 중 대화는 공급자를 바꿀 수 없다.
  if (history.length > 0 && provider !== serverProvider) {
    throw new HttpsError("failed-precondition", PROVIDER_CHANGED_MESSAGE);
  }

  // 기록 원형은 공급자가 만든 role·블록 타입만 받는다(이미지·문서·cache_control 등 거부).
  if (!history.every((m) => isPlainObject(m) && isValidHistoryMessage(m))) {
    throw invalid("history 형식이 올바르지 않습니다.");
  }

  const hasText = userText !== undefined && userText !== null;
  const hasResults = toolResults !== undefined && toolResults !== null;

  if (hasText === hasResults) {
    throw invalid("userText와 toolResults 중 하나만 보내야 합니다.");
  }

  if (hasText) {
    if (typeof userText !== "string" || userText.trim().length === 0) {
      throw invalid("userText가 비어 있습니다.");
    }

    if (userText.length > MAX_USER_TEXT) {
      throw invalid("메시지는 2,000자 이하로 보내 주세요.");
    }
  }

  if (hasResults) {
    const ok = Array.isArray(toolResults) && toolResults.length > 0 &&
      toolResults.length <= MAX_TOOL_RESULTS &&
      toolResults.every((r) => isPlainObject(r) &&
        typeof r.name === "string" &&
        (r.id === undefined || r.id === null || typeof r.id === "string") &&
        isPlainObject(r.content) &&
        typeof r.isError === "boolean");

    if (!ok) {
      throw invalid("toolResults 형식이 올바르지 않습니다.");
    }

    const tooLarge = toolResults
        .some((r) => byteLengthOf(r.content) > MAX_TOOL_RESULT_BYTES);

    if (tooLarge) {
      throw invalid("toolResults 결과가 너무 큽니다.");
    }

    if (history.length === 0) {
      throw invalid("toolResults에 짝지을 기록이 없습니다.");
    }
  }

  if (!LOCALES.includes(locale)) {
    throw invalid("locale 값이 올바르지 않습니다.");
  }

  if (!isValidDate(today)) {
    throw invalid("today는 YYYY-MM-DD여야 합니다.");
  }

  if (!isPlainObject(context)) {
    throw invalid("context 형식이 올바르지 않습니다.");
  }

  const bagId = context.bagId ?? undefined;

  if (bagId !== undefined &&
    (typeof bagId !== "string" || bagId.length === 0 ||
      bagId.length > 128 || bagId.includes("/"))) {
    throw invalid("context.bagId 값이 올바르지 않습니다.");
  }

  return {
    history,
    userText: hasText ? userText : undefined,
    toolResults: hasResults ? toolResults : undefined,
    locale,
    today,
    bagId,
  };
};

/**
 * 기록 끝 메시지의 도구 호출과 toolResults를 짝짓는다(AS-1·AS-5).
 * - userText 요청: 끝 메시지에 미결 호출이 있으면 거부한다.
 * - toolResults 요청: 끝 메시지의 쓰기 호출마다 결과가 정확히 하나 있어야 한다.
 *   id가 있으면 id로, 없으면 쓰기 호출 순서·이름으로 맞춘다.
 *   같은 메시지의 읽기 호출은 이번 요청에서 서버가 실행한다.
 * @return {{calls: object[], writeResults: Map<string, object>} | null}
 */
export const pairToolResults = ({history, toolResults, extractCalls}) => {
  const last = history[history.length - 1];
  const calls = last ? extractCalls(last) : [];

  if (!toolResults) {
    if (calls.length > 0) {
      throw invalid("먼저 이전 변경안의 결과를 보내야 합니다.");
    }

    return null;
  }

  const writeCalls = calls.filter((c) => isWriteTool(c.name));

  if (writeCalls.length === 0) {
    throw invalid("toolResults에 짝지을 변경안이 없습니다.");
  }

  if (toolResults.length !== writeCalls.length) {
    throw invalid("toolResults 개수가 변경안과 맞지 않습니다.");
  }

  const writeResults = new Map();

  writeCalls.forEach((call, i) => {
    const byId = toolResults.find((r) => r.id && r.id === call.id);
    const result = byId ?? (toolResults[i]?.id ? undefined : toolResults[i]);

    if (!result || result.name !== call.name || writeResults.has(call.id)) {
      throw invalid("toolResults가 변경안과 맞지 않습니다.");
    }

    writeResults.set(call.id, result);
  });

  if (new Set([...writeResults.values()]).size !== writeCalls.length) {
    throw invalid("toolResults가 변경안과 맞지 않습니다.");
  }

  return {calls, writeResults};
};

const weekdayOf = (isoDate) =>
  WEEKDAYS_KO[new Date(`${isoDate}T00:00:00Z`).getUTCDay()];

// 모델이 요일·상대 날짜를 잘못 세는 일이 잦아(실측) 오늘부터 21일 달력을 준다.
const buildCalendar = (today) => {
  const start = Date.parse(`${today}T00:00:00Z`);
  const days = [];

  for (let i = 0; i < CALENDAR_DAYS; i += 1) {
    const iso = new Date(start + i * DAY_MS).toISOString().slice(0, 10);

    days.push(`${iso}(${weekdayOf(iso)})`);
  }

  return days.join(" ");
};

export const buildFirstTurnPrefix = ({today, locale, tripSnapshot}) => {
  const lines = [
    `[오늘] ${today} (${weekdayOf(today)}) · 언어: ${locale}`,
    `[달력] ${buildCalendar(today)}`,
  ];

  if (tripSnapshot) {
    lines.push("[여행 현황]", JSON.stringify(tripSnapshot));
  }

  return `${lines.join("\n")}\n\n`;
};

/**
 * 한 턴을 돈다. provider는 history에 push하므로 끝나면
 * history.slice(startLength)가 appended다.
 * 모드 호출은 아래 선택 인자로 동작을 좁힌다(대화 경로는 기본값).
 * - isTerminalTool: 실행하지 않고 턴을 끝내는 터미널 도구
 *   (대화=쓰기 도구, gear_fill=결과 도구)
 * - maxModelCalls: 모델 호출 상한(넘으면 internal)
 * - toolLimits: 도구별 호출 상한(넘으면 실행 대신 오류 결과)
 * - nudgeText: 도구 없이 텍스트로 끝나면 한 번 더 보낼 사용자 메시지
 * - onReadResult(call, content): 성공한 읽기 결과를 받는다(결과 검증용)
 * - finalCall: {tools, text} — 마지막 허용 모델 호출에서 부를 수 있는 도구를
 *   좁힌다(Gemini는 allowedFunctionNames, Anthropic은 안내 text를 덧붙임)
 */
export const runTurn = async ({
  provider,
  readHandlers,
  userText,
  pairing,
  onText,
  onStatus,
  log,
  deadline,
  isTerminalTool = isWriteTool,
  maxModelCalls = MAX_MODEL_CALLS_PER_TURN,
  toolLimits = {},
  nudgeText,
  onReadResult,
  finalCall,
}) => {
  const usage = {input: 0, output: 0, cacheRead: 0, cacheWrite: 0};
  const texts = [];
  let readCount = 0;
  let modelCalls = 0;
  let stopReason = "end";
  let pendingActions = [];
  let nudged = false;
  const toolCounts = {};

  const runRead = async (call) => {
    readCount += 1;
    toolCounts[call.name] = (toolCounts[call.name] ?? 0) + 1;

    if (toolLimits[call.name] !== undefined &&
      toolCounts[call.name] > toolLimits[call.name]) {
      log({event: "tool", tool: call.name, skipped: "tool_limit"});

      return {...call, content: TOOL_LIMIT_ERROR, isError: true};
    }

    if (readCount > MAX_READS_PER_TURN) {
      log({event: "tool", tool: call.name, skipped: "read_limit"});

      return {...call, content: READ_LIMIT_ERROR, isError: true};
    }

    // Firestore 읽기에는 타임아웃이 없어 실행 전에 마감을 확인한다. 읽은 뒤 모델을
    // 한 번 더 불러야 하므로 모델 호출 최소 여유(5초)를 남겨 둔다.
    if (deadline - Date.now() < MIN_MODEL_CALL_MS) {
      log({event: "tool", tool: call.name, skipped: "deadline"});

      return {...call, content: READ_DEADLINE_ERROR, isError: true};
    }

    const handler = readHandlers[call.name];
    const started = Date.now();

    onStatus?.(call.name);

    try {
      const content = handler ?
        await handler(call.input ?? {}) :
        {error: `알 수 없는 도구 ${call.name}`};

      log({
        event: "tool",
        tool: call.name,
        ms: Date.now() - started,
        resultChars: JSON.stringify(content).length,
      });

      if (handler) {
        onReadResult?.(call, content);
      }

      return {...call, content, isError: !handler};
    } catch (err) {
      log({
        event: "tool",
        tool: call.name,
        ms: Date.now() - started,
        error: err?.code ?? err?.name ?? "error",
      });

      const message = err instanceof HttpsError ?
        err.message :
        "도구 실행 중 오류가 났습니다.";

      return {...call, content: {error: message}, isError: true};
    }
  };

  const runReads = async (calls) => {
    const results = [];

    // 상한·상태 순서를 지키려고 차례로 실행한다(읽기는 대부분 수백 ms).
    for (const call of calls) {
      results.push(await runRead(call));
    }

    return results;
  };

  let pending;

  if (pairing) {
    // 터미널 도구 결과(앱·서버) + 같은 메시지의 읽기 호출(서버 실행)을
    // 호출 순서대로 합친다.
    const reads = await runReads(
        pairing.calls.filter((c) => !isTerminalTool(c.name)));
    const readById = new Map(reads.map((r) => [r.id, r]));
    const toolResults = pairing.calls.map((c) => {
      if (isTerminalTool(c.name)) {
        const r = pairing.writeResults.get(c.id);

        return {...c, content: r.content, isError: r.isError};
      }

      return readById.get(c.id);
    });

    pending = {toolResults};
  } else {
    pending = {userText};
  }

  for (;;) {
    const remainingMs = deadline - Date.now();

    // 남은 시간이 없으면 모델을 부르지 않는다. 앱은 appended를 받지 못한 요청을
    // 기록에 남기지 않으므로 기록 짝은 깨지지 않는다(AS-7·AS-8).
    if (remainingMs < MIN_MODEL_CALL_MS) {
      log({event: "deadline_exceeded", modelCalls});
      throw new HttpsError(
          "unavailable",
          "연결이 불안정해요. 잠시 후 다시 시도해 주세요",
      );
    }

    // 마지막 허용 호출이면 터미널 도구만 부르게 좁힌다(모드 호출).
    const isFinalCall = Boolean(finalCall) && modelCalls === maxModelCalls - 1;

    modelCalls += 1;

    const res = await provider.send({
      ...pending,
      onText,
      onStatus,
      deadline,
      ...(isFinalCall ? {finalCall} : {}),
    });

    usage.input += res.usage.input;
    usage.output += res.usage.output;
    usage.cacheRead += res.usage.cacheRead;
    usage.cacheWrite += res.usage.cacheWrite;

    if (res.text) {
      texts.push(res.text);
    }

    if (res.stopReason === "refusal") {
      stopReason = "refusal";
      break;
    }

    if (res.toolCalls.length === 0) {
      // 모드 호출: 결과 도구 없이 텍스트로 끝나면 한 번만 다시 유도한다.
      if (nudgeText && !nudged && modelCalls < maxModelCalls) {
        nudged = true;
        log({event: "nudge"});
        pending = {userText: nudgeText};
        continue;
      }

      stopReason = res.stopReason === "max_tokens" ? "max_tokens" : "end";
      break;
    }

    const terminalCalls = res.toolCalls.filter((c) => isTerminalTool(c.name));

    // 터미널 도구(쓰기·결과)가 나오면 턴을 끝낸다. 같은 메시지의 읽기는 다음
    // 요청(결과 이어 보내기)에서 서버가 실행해 터미널 결과와 한 메시지로 합친다
    // — 기록 짝을 깨지 않기 위해서다.
    if (terminalCalls.length > 0) {
      pendingActions = terminalCalls.map((c) => ({
        id: c.id,
        name: c.name,
        input: c.input ?? {},
      }));
      stopReason = "tool_use";
      break;
    }

    // 응답 없이 끝내면 기록 끝에 짝 없는 호출이 남으므로 실패로 돌려준다.
    // 앱은 appended를 받지 못한 요청을 기록에 남기지 않는다(AS-7).
    if (modelCalls >= maxModelCalls) {
      log({event: "model_call_limit"});
      throw new HttpsError("internal", "응답을 마무리하지 못했습니다.");
    }

    pending = {toolResults: await runReads(res.toolCalls)};
  }

  return {
    text: stopReason === "refusal" ? REFUSAL_TEXT : texts.join("\n\n"),
    pendingActions,
    stopReason,
    usage,
    readCount,
    modelCalls,
  };
};

import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import process from "node:process";
import admin from "firebase-admin";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import {logger} from "firebase-functions";
import {SYSTEM_PROMPT} from "./assistant/prompt.js";
import {TOOL_DECLARATIONS, createReadTools} from "./assistant/tools.js";
import {UsageKind, consumeDailyUsage} from "./assistant/usage.js";
import {
  buildFirstTurnPrefix,
  pairToolResults,
  runTurn,
  validateRequest,
} from "./assistant/engine.js";
import * as anthropicProvider from "./assistant/providers/anthropic.js";
import * as geminiProvider from "./assistant/providers/gemini.js";
import {runGearFill} from "./assistant/gearFill.js";

// 여행 도우미(AI로 여행 계획하기) callable — 앱 레포 specs/Assistant.md
// AS-1·AS-2·AS-4·AS-5·AS-6·AS-8·AS-9·AS-10·AS-12.
// 함수는 무상태다. 앱이 공급자 원형 history를 보내고, 함수는 이번 턴에 덧붙인
// 메시지(appended)와 표시 텍스트·쓰기 제안(pendingActions)을 돌려준다.

const REGION = "asia-northeast3";
const MAX_INSTANCES = 10;
const TIMEOUT_SECONDS = 120;
// 함수 제한(120초)보다 먼저 공급자 재시도를 멈춰 응답할 여유를 남긴다.
const PROVIDER_DEADLINE_MS = 100 * 1000;
const DEFAULT_PROVIDER = "gemini";
const DEFAULT_MODELS = {
  gemini: "gemini-3.1-flash-lite",
  anthropic: "claude-haiku-4-5",
};
const UNSET_SECRET = "unset";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const PROVIDERS = {
  anthropic: {module: anthropicProvider, secret: ANTHROPIC_API_KEY},
  gemini: {module: geminiProvider, secret: GEMINI_API_KEY},
};

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// 공급자·모델은 functions/.env(배포 시 환경값)로 고른다.
// 잘못된 ASSISTANT_PROVIDER는 기본값으로 돌리고 경고를 남긴다.
const readConfig = () => {
  const envProvider = String(process.env.ASSISTANT_PROVIDER ?? "").trim();

  if (envProvider && !PROVIDERS[envProvider]) {
    logger.warn("tripAssistant", {
      event: "invalid_provider_config",
      value: envProvider.slice(0, 32),
      fallback: DEFAULT_PROVIDER,
    });
  }

  const provider = PROVIDERS[envProvider] ? envProvider : DEFAULT_PROVIDER;
  const model = String(process.env.ASSISTANT_MODEL ?? "").trim() ||
    DEFAULT_MODELS[provider];

  return {provider, model};
};

// 로그에는 uid 대신 해시 앞 8자만 남긴다(AS-10).
const hashUid = (uid) =>
  crypto.createHash("sha256").update(uid).digest("hex").slice(0, 8);

// fetch 중단(Gemini abortSignal 등)이 던지는 DOMException 이름.
const ABORT_ERROR_NAMES = new Set(["AbortError", "TimeoutError"]);

// Anthropic SDK 오류는 name이 모두 "Error"라 클래스로 구분한다.
// APIConnectionTimeoutError는 APIConnectionError의 하위 클래스다.
const isConnectionError = (err) =>
  err instanceof Anthropic.APIConnectionError ||
  err instanceof Anthropic.APIUserAbortError ||
  ABORT_ERROR_NAMES.has(err?.name);

// 공급자 429·5xx·연결·시간 초과(SDK·내부 재시도 뒤)는 unavailable, 나머지는 internal.
const toHttpsError = (err) => {
  if (err instanceof HttpsError) {
    return err;
  }

  const status = typeof err?.status === "number" ? err.status : null;

  if (status === 429 || (status !== null && status >= 500) ||
    isConnectionError(err)) {
    return new HttpsError(
        "unavailable",
        "연결이 불안정해요. 잠시 후 다시 시도해 주세요",
    );
  }

  return new HttpsError("internal", "문제가 생겼어요. 다시 시도해 주세요");
};

export const tripAssistant = onCall({
  region: REGION,
  secrets: [ANTHROPIC_API_KEY, GEMINI_API_KEY],
  timeoutSeconds: TIMEOUT_SECONDS,
  memory: "512MiB",
  maxInstances: MAX_INSTANCES,
  // 인증은 Firebase Auth ID 토큰(request.auth)으로 확인한다 — Cloud Run 호출은 공개.
  invoker: "public",
}, async (request, response) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const startedAt = Date.now();
  const deadline = startedAt + PROVIDER_DEADLINE_MS;
  const uidHash = hashUid(uid);
  const {provider: providerName, model} = readConfig();
  const {module: providerModule, secret} = PROVIDERS[providerName];
  const log = (entry) => logger.info("tripAssistant", {
    uid: uidHash,
    provider: providerName,
    model,
    ...entry,
  });
  let stage = "validate";

  try {
    // 모드 호출(AS-1 개정): mode가 있으면 대화 경로 대신 모드 처리. 기록 없음.
    if (request.data?.mode !== undefined) {
      const key = secret.value();
      const result = await runGearFill({
        data: request.data,
        uid,
        providerName,
        model,
        providerModule,
        apiKey: key && key !== UNSET_SECRET ? key : null,
        log,
        deadline,
        setStage: (next) => {
          stage = next;
        },
      });

      log({event: "mode_done", mode: result.mode, ms: Date.now() - startedAt});

      return result;
    }

    // 1. 입력 검증(사용량을 세기 전에).
    const req = validateRequest(request.data, {
      serverProvider: providerName,
      providerNames: Object.keys(PROVIDERS),
      isValidHistoryMessage: providerModule.isValidHistoryMessage,
    });
    const pairing = pairToolResults({
      history: req.history,
      toolResults: req.toolResults,
      extractCalls: providerModule.extractCalls,
    });
    const kind = req.userText !== undefined ?
      UsageKind.USER_TEXT :
      UsageKind.TOOL_RESULTS;

    // 2. 키가 없으면 세기 전에 실패한다.
    const apiKey = secret.value();

    if (!apiKey || apiKey === UNSET_SECRET) {
      log({event: "api_key_missing"});
      throw new HttpsError("internal", "문제가 생겼어요. 다시 시도해 주세요");
    }

    // 3. 첫 요청이면 날짜·언어·달력(+ 여행 현황) 블록을 사용자 텍스트 앞에 붙인다.
    stage = "prefix";

    const {handlers, getTrip} = createReadTools({
      uid,
      bagId: req.bagId,
      today: req.today,
    });
    let userText = req.userText;

    if (userText !== undefined && req.history.length === 0) {
      const tripSnapshot = req.bagId ? await getTrip() : null;

      userText = buildFirstTurnPrefix({
        today: req.today,
        locale: req.locale,
        tripSnapshot,
      }) + userText;
    }

    // 4. 사용량: 발화(20/일)와 결과 이어 보내기(60/일)를 모델 호출 전에 센다(AS-9).
    stage = "usage";

    const remaining = await consumeDailyUsage(uid, kind);

    // 5. 턴 실행. 공급자는 history 사본 뒤에 push하고, 늘어난 부분이 appended다.
    stage = "turn";

    const history = [...req.history];
    const startLength = history.length;
    const provider = providerModule.createProvider({
      apiKey,
      model,
      system: SYSTEM_PROMPT,
      tools: TOOL_DECLARATIONS,
      webSearch: true,
      log,
      history,
    });
    const streaming = Boolean(request.acceptsStreaming);
    const sendChunk = (chunk) => {
      response?.sendChunk(chunk).catch(() => {});
    };
    const result = await runTurn({
      provider,
      readHandlers: handlers,
      userText,
      pairing,
      onText: streaming ?
        (text) => sendChunk({type: "text_delta", text}) :
        undefined,
      onStatus: streaming ?
        (tool) => sendChunk({type: "status", tool}) :
        undefined,
      log,
      deadline,
    });

    log({
      event: "turn",
      kind,
      stopReason: result.stopReason,
      pendingActions: result.pendingActions.map((a) => a.name),
      reads: result.readCount,
      modelCalls: result.modelCalls,
      usage: result.usage,
      ms: Date.now() - startedAt,
    });

    return {
      provider: providerName,
      model,
      appended: history.slice(startLength),
      text: result.text,
      pendingActions: result.pendingActions,
      remaining,
      stopReason: result.stopReason,
    };
  } catch (err) {
    const mapped = toHttpsError(err);

    logger.warn("tripAssistant", {
      uid: uidHash,
      provider: providerName,
      model,
      event: "error",
      stage,
      code: mapped.code,
      status: typeof err?.status === "number" ? err.status : null,
      // SDK 오류는 name이 "Error"라 클래스 이름을 남긴다.
      errorName: err?.constructor?.name ?? err?.name ?? null,
      ms: Date.now() - startedAt,
    });

    throw mapped;
  }
});

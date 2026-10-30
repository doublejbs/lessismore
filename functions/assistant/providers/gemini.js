import {FunctionCallingConfigMode, GoogleGenAI} from "@google/genai";
import {REFUSAL_TEXT} from "../prompt.js";
import {GEMINI_UNSUPPORTED_KEYS, sanitizeSchema} from "../schema.js";
import {isValidGeminiMessage} from "../historyGuard.js";

// Google Gemini 공급자 — 앱 레포 specs/Assistant.md AS-1·AS-8·AS-12.
// 인터페이스: send({userText | toolResults, onText, onStatus, deadline})
//   → {text, toolCalls: [{id, providerId, name, input}], stopReason, usage}
// 기록(history)은 앱이 들고 오는 Content[]이고 여기서는 뒤에 push만 한다.
// v1은 비스트리밍 generateContent — 텍스트는 응답이 끝난 뒤 한 번에 넘긴다.

const MAX_OUTPUT_TOKENS = 8192;
const MAX_RATE_LIMIT_RETRIES = 3;
const MAX_SERVER_ERROR_RETRIES = 2;
const DEFAULT_RETRY_MS = 20000;
const MAX_RETRY_WAIT_MS = 30000;
const SERVER_ERROR_RETRY_MS = 2000;
const MAX_REQUEST_TIMEOUT_MS = 90000;
// 재시도 대기 뒤 다음 요청에 최소한 이만큼은 남아 있어야 기다린다.
const MIN_REQUEST_MS = 15000;
const EMPTY_TEXT = "…";
const BLOCKED_FINISH_REASONS = new Set([
  "SAFETY",
  "PROHIBITED_CONTENT",
  "BLOCKLIST",
  "SPII",
  "RECITATION",
]);

/**
 * 기록 메시지 검사(금지 목록 — inlineData·fileData 등만 거부).
 */
export const isValidHistoryMessage = isValidGeminiMessage;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const retryDelayMs = (err) => {
  const m = String(err?.message ?? "")
      .match(/retry(?:Delay|\s+in)\D*(\d+(?:\.\d+)?)\s*s/i);
  const ms = m ? Math.ceil(Number(m[1]) * 1000) + 500 : DEFAULT_RETRY_MS;

  return Math.min(ms, MAX_RETRY_WAIT_MS);
};

const isRateLimit = (err) => err?.status === 429 ||
  /RESOURCE_EXHAUSTED/.test(String(err?.message ?? ""));

const isServerError = (err) => typeof err?.status === "number" &&
  err.status >= 500;

/**
 * model 메시지 안의 functionCall을 순서대로 꺼낸다.
 * Gemini는 id가 없을 수 있어 앱에 줄 id는 `call_{순번}`(1부터)으로 발급한다.
 */
export const extractCalls = (content) => {
  if (content?.role !== "model" || !Array.isArray(content.parts)) {
    return [];
  }

  const calls = [];

  for (const part of content.parts) {
    const fc = part?.functionCall;

    if (!fc) {
      continue;
    }

    calls.push({
      id: fc.id || `call_${calls.length + 1}`,
      providerId: fc.id || undefined,
      name: fc.name,
      input: fc.args ?? {},
    });
  }

  return calls;
};

export const createProvider = ({
  apiKey,
  model,
  system,
  tools,
  webSearch,
  log,
  history,
  forceToolCall = false,
}) => {
  const ai = new GoogleGenAI({apiKey});
  const functionDeclarations = tools.map((t) => ({
    name: t.name,
    description: t.description,
    parametersJsonSchema: sanitizeSchema(t.input_schema,
        GEMINI_UNSUPPORTED_KEYS),
  }));
  let searchEnabled = Boolean(webSearch);
  // 모드 호출: 텍스트만으로 끝나는 응답을 막고 이 모드 도구 중 하나를 꼭 부르게 한다.
  const toolConfig = forceToolCall ? {
    toolConfig: {
      functionCallingConfig: {
        mode: FunctionCallingConfigMode.ANY,
        allowedFunctionNames: tools.map((t) => t.name),
      },
    },
  } : {};

  const buildTools = () => {
    const list = [{functionDeclarations}];

    if (searchEnabled) {
      list.push({googleSearch: {}});
    }

    return list;
  };

  const callModel = async (deadline) => {
    // 기다린 뒤에도 다음 요청을 보낼 시간이 남아야 기다린다.
    const canWait = (ms) => Date.now() + ms + MIN_REQUEST_MS < deadline;

    let rateLimitRetries = 0;
    let serverErrorRetries = 0;

    for (;;) {
      try {
        return await ai.models.generateContent({
          model,
          contents: history,
          config: {
            systemInstruction: system,
            tools: buildTools(),
            ...toolConfig,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            abortSignal: AbortSignal.timeout(Math.max(1000,
                Math.min(MAX_REQUEST_TIMEOUT_MS, deadline - Date.now()))),
          },
        });
      } catch (err) {
        const msg = String(err?.message ?? "");

        // 검색 그라운딩과 함수 호출을 한 요청에 못 섞는 모델이면 검색을 끈다.
        if (searchEnabled && err?.status === 400 && /tool|search/i.test(msg)) {
          searchEnabled = false;
          log?.({event: "web_search_disabled", reason: "400"});
          continue;
        }

        // 무료 등급은 검색 그라운딩 한도가 0이라 첫 호출부터 429 — 검색을 끄고 재시도.
        if (searchEnabled && isRateLimit(err)) {
          searchEnabled = false;
          log?.({event: "web_search_disabled", reason: "429"});
          continue;
        }

        if (isRateLimit(err) && rateLimitRetries < MAX_RATE_LIMIT_RETRIES) {
          const wait = retryDelayMs(err);

          if (canWait(wait)) {
            rateLimitRetries += 1;
            log?.({
              event: "rate_limited",
              waitMs: wait,
              retry: rateLimitRetries,
            });
            await sleep(wait);
            continue;
          }
        }

        if (isServerError(err) &&
          serverErrorRetries < MAX_SERVER_ERROR_RETRIES &&
          canWait(SERVER_ERROR_RETRY_MS)) {
          serverErrorRetries += 1;
          log?.({event: "server_error_retry", status: err.status});
          await sleep(SERVER_ERROR_RETRY_MS);
          continue;
        }

        throw err;
      }
    }
  };

  const send = async ({userText, toolResults, onText, deadline}) => {
    if (userText !== undefined) {
      history.push({role: "user", parts: [{text: userText}]});
    } else {
      history.push({
        role: "user",
        parts: toolResults.map((r) => ({
          functionResponse: {
            ...(r.providerId ? {id: r.providerId} : {}),
            name: r.name,
            response: r.isError ? {error: r.content} : {output: r.content},
          },
        })),
      });
    }

    const response = await callModel(deadline);
    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason ?? null;
    const blocked = Boolean(response.promptFeedback?.blockReason) ||
      BLOCKED_FINISH_REASONS.has(finishReason);
    const parts = candidate?.content?.parts ?? [];
    const text = parts
        .filter((p) => p.text && !p.thought)
        .map((p) => p.text)
        .join("");
    const um = response.usageMetadata ?? {};
    const cached = um.cachedContentTokenCount ?? 0;
    const usage = {
      input: (um.promptTokenCount ?? 0) - cached,
      output: (um.candidatesTokenCount ?? 0) + (um.thoughtsTokenCount ?? 0),
      cacheRead: cached,
      cacheWrite: 0,
    };

    log?.({
      event: "model_call",
      finishReason,
      blocked,
      webSearches: candidate?.groundingMetadata?.webSearchQueries?.length ?? 0,
      usage: {
        promptTokenCount: um.promptTokenCount ?? 0,
        candidatesTokenCount: um.candidatesTokenCount ?? 0,
        thoughtsTokenCount: um.thoughtsTokenCount ?? 0,
        cachedContentTokenCount: cached,
      },
    });

    // 모델 턴은 functionCall·thoughtSignature까지 그대로 남겨야 다음
    // functionResponse와 짝이 맞는다. 내용이 없으면 자리 텍스트를 둔다.
    const content = parts.length > 0 ?
      {...candidate.content, role: "model"} :
      {role: "model", parts: [{text: blocked ? REFUSAL_TEXT : EMPTY_TEXT}]};

    history.push(content);

    if (text && onText) {
      onText(text);
    }

    const toolCalls = extractCalls(content);
    let stopReason = toolCalls.length > 0 ? "tool_use" : "end";

    if (blocked) {
      stopReason = "refusal";
    } else if (finishReason === "MAX_TOKENS") {
      stopReason = "max_tokens";
    }

    return {text, toolCalls, stopReason, usage};
  };

  return {model, send};
};

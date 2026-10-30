import Anthropic from "@anthropic-ai/sdk";
import {HttpsError} from "firebase-functions/v2/https";
import {REFUSAL_TEXT} from "../prompt.js";
import {
  ANTHROPIC_STRICT_UNSUPPORTED_KEYS,
  sanitizeSchema,
} from "../schema.js";
import {isValidAnthropicMessage} from "../historyGuard.js";

// Anthropic(Claude) 공급자 — 앱 레포 specs/Assistant.md AS-1·AS-12.
// 인터페이스: send({userText | toolResults, onText, onStatus, deadline})
//   → {text, toolCalls: [{id, providerId, name, input}], stopReason, usage}
// 기록(history)은 앱이 들고 오는 MessageParam[]이고 여기서는 뒤에 push만 한다.

const MAX_TOKENS = 4096;
const MAX_PAUSE_RESUMES = 3;
const MAX_REQUEST_TIMEOUT_MS = 90000;
const MAX_RETRIES = 3;
// 남은 시간이 이만큼 있을 때마다 SDK 재시도 1회를 허용한다.
const RETRY_BUDGET_MS = 25000;
const WEB_SEARCH_MAX_USES = 3;
// 동적 필터링 웹 검색(_20260209)을 못 쓰는 이전 세대 모델.
const BASIC_WEB_SEARCH_MODELS = /haiku-4-5|sonnet-4-5|opus-4-5/;
// output_config.effort를 거부하는 모델(Haiku 4.5·Sonnet 4.5는 400).
const EFFORT_UNSUPPORTED_MODELS = /haiku-4-5|sonnet-4-5/;
// 서버 측 거절 폴백(fallbacks: "default")은 Fable 5/5.1·Opus 5/5.5·Sonnet 5.5
// 계열에서만 문서화돼 있다. Haiku 4.5 등 그 밖의 모델은 넣지 않는다(미지원 → 400).
const FALLBACK_MODELS = /fable-5|mythos-5|opus-5|sonnet-5-5/;
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
const EMPTY_TEXT = "…";
/**
 * 기록 메시지 검사(금지 목록 — 이미지·문서·cache_control 등만 거부).
 * 서버가 붙이는 cache_control은 요청 사본에만 둔다.
 */
export const isValidHistoryMessage = isValidAnthropicMessage;

/**
 * assistant 메시지 안의 tool_use를 순서대로 꺼낸다.
 * 앱에 주는 id는 tool_use id 그대로다.
 */
export const extractCalls = (message) => {
  if (message?.role !== "assistant" || !Array.isArray(message.content)) {
    return [];
  }

  return message.content
      .filter((b) => b?.type === "tool_use")
      .map((b) => ({
        id: b.id,
        providerId: b.id,
        name: b.name,
        input: b.input ?? {},
      }));
};

const toStopReason = (message, toolCalls) => {
  if (message.stop_reason === "refusal") {
    return "refusal";
  }

  if (message.stop_reason === "max_tokens") {
    return "max_tokens";
  }

  return toolCalls.length > 0 ? "tool_use" : "end";
};

// 대화 기록도 캐시되게 마지막 사용자 메시지의 마지막 블록에 cache_control을 둔다.
// 앱이 들고 다니는 기록(append-only)은 건드리지 않고 요청 사본에만 붙인다.
// 캐시 지점: 도구 1 + system 1 + 기록 1 = 3(상한 4).
const withHistoryCache = (history) => {
  let index = -1;

  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i].role === "user") {
      index = i;
      break;
    }
  }

  if (index < 0) {
    return history;
  }

  const target = history[index];
  const blocks = typeof target.content === "string" ?
    [{type: "text", text: target.content}] :
    target.content;
  const last = blocks.length - 1;
  const content = blocks.map((b, i) => (i === last ?
    {...b, cache_control: {type: "ephemeral"}} :
    b));
  const copy = [...history];

  copy[index] = {...target, content};

  return copy;
};

export const createProvider = ({
  apiKey,
  model,
  system,
  tools,
  webSearch,
  log,
  history,
}) => {
  const client = new Anthropic({apiKey});
  // strict: true — 숫자·길이·패턴 제약은 strict 스키마가 지원하지 않아 뺀다
  // (같은 제약이 설명에 있다). 모든 객체 스키마는 additionalProperties: false다.
  const customTools = tools.map((t, i) => ({
    name: t.name,
    description: t.description,
    input_schema: sanitizeSchema(t.input_schema,
        ANTHROPIC_STRICT_UNSUPPORTED_KEYS),
    strict: true,
    // tools → system 순으로 렌더링되므로 둘 다 캐시 지점을 둔다(AS-12).
    ...(i === tools.length - 1 ? {cache_control: {type: "ephemeral"}} : {}),
  }));
  const webSearchType = BASIC_WEB_SEARCH_MODELS.test(model) ?
    "web_search_20250305" :
    "web_search_20260209";
  const allTools = webSearch ? [
    ...customTools,
    {
      type: webSearchType,
      name: "web_search",
      max_uses: WEB_SEARCH_MAX_USES,
      user_location: {
        type: "approximate",
        country: "KR",
        timezone: "Asia/Seoul",
      },
    },
  ] : customTools;
  // thinking은 넣지 않는다 — Haiku 4.5는 기본이 thinking 없음이고(adaptive
  // 미지원), 5.x 계열은 생략하면 adaptive로 돈다.
  const outputConfig = EFFORT_UNSUPPORTED_MODELS.test(model) ?
    {} :
    {output_config: {effort: "low"}};
  const useFallbacks = FALLBACK_MODELS.test(model);

  const openStream = (body, requestOptions) => (useFallbacks ?
    client.beta.messages.stream({
      ...body,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
    }, requestOptions) :
    client.messages.stream(body, requestOptions));

  const send = async ({
    userText,
    toolResults,
    onText,
    onStatus,
    deadline,
    finalCall,
  }) => {
    // 강제 tool_choice를 쓰지 않으므로(5.5 계열 거절) 마지막 허용 호출에서는
    // 결과 도구만 부르라는 안내를 같은 사용자 메시지 끝에 덧붙인다.
    const finalText = finalCall?.text ?
      [{type: "text", text: finalCall.text}] :
      [];

    if (userText !== undefined) {
      history.push({
        role: "user",
        content: finalText.length > 0 ?
          [{type: "text", text: userText}, ...finalText] :
          userText,
      });
    } else {
      history.push({
        role: "user",
        content: [
          ...toolResults.map((r) => ({
            type: "tool_result",
            tool_use_id: r.providerId,
            content: JSON.stringify(r.content),
            is_error: Boolean(r.isError),
          })),
          ...finalText,
        ],
      });
    }

    const usage = {input: 0, output: 0, cacheRead: 0, cacheWrite: 0};
    const texts = [];

    for (let resumes = 0; ; resumes += 1) {
      const remainingMs = Math.max(1000, deadline - Date.now());
      const stream = openStream({
        model,
        max_tokens: MAX_TOKENS,
        system: [{
          type: "text",
          text: system,
          cache_control: {type: "ephemeral"},
        }],
        tools: allTools,
        messages: withHistoryCache(history),
        ...outputConfig,
      }, {
        // timeout은 시도 한 번당이라 재시도와 곱해진다 — signal로 재시도까지 포함한
        // 전체 시간을 남은 예산에 묶는다(넘으면 APIUserAbortError → unavailable).
        timeout: Math.min(MAX_REQUEST_TIMEOUT_MS, remainingMs),
        maxRetries: Math.min(MAX_RETRIES,
            Math.floor(remainingMs / RETRY_BUDGET_MS)),
        signal: AbortSignal.timeout(remainingMs),
      });

      if (onText) {
        stream.on("text", (delta) => onText(delta));
      }

      if (onStatus) {
        stream.on("streamEvent", (event) => {
          if (event.type === "content_block_start" &&
            event.content_block?.type === "server_tool_use") {
            onStatus(event.content_block.name);
          }
        });
      }

      const message = await stream.finalMessage();
      const u = message.usage ?? {};

      usage.input += u.input_tokens ?? 0;
      usage.output += u.output_tokens ?? 0;
      usage.cacheRead += u.cache_read_input_tokens ?? 0;
      usage.cacheWrite += u.cache_creation_input_tokens ?? 0;

      log?.({
        event: "model_call",
        stopReason: message.stop_reason,
        webSearches: message.content
            .filter((b) => b.type === "server_tool_use").length,
        usage: {
          input_tokens: u.input_tokens ?? 0,
          output_tokens: u.output_tokens ?? 0,
          cache_read_input_tokens: u.cache_read_input_tokens ?? 0,
          cache_creation_input_tokens: u.cache_creation_input_tokens ?? 0,
        },
      });

      // 빈 assistant 메시지는 다음 요청에서 거부되므로 자리 텍스트를 넣는다.
      const content = message.content.length > 0 ? message.content : [{
        type: "text",
        text: message.stop_reason === "refusal" ? REFUSAL_TEXT : EMPTY_TEXT,
      }];

      history.push({role: "assistant", content});

      // 한 메시지의 text 블록은 인용 때문에 문장 중간에서 나뉠 수 있어 그대로 잇는다.
      const text = message.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("");

      if (text) {
        texts.push(text);
      }

      // 서버 도구(웹 검색)가 길어지면 턴이 잠시 멈춘다 — 그대로 이어 보낸다.
      if (message.stop_reason === "pause_turn") {
        if (resumes < MAX_PAUSE_RESUMES) {
          continue;
        }

        // 재개 상한에 걸리면 미완성 턴을 돌려주지 않는다(앱은 기록에 남기지 않음).
        log?.({event: "pause_turn_limit"});
        throw new HttpsError(
            "unavailable",
            "연결이 불안정해요. 잠시 후 다시 시도해 주세요",
        );
      }

      const toolCalls = extractCalls({role: "assistant", content});

      return {
        text: texts.join("\n\n"),
        toolCalls,
        stopReason: toStopReason(message, toolCalls),
        usage,
      };
    }
  };

  return {model, send};
};

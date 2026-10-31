// 앱이 돌려보내는 기록 메시지 검사 — 금지 목록 방식(앱 레포 specs/Assistant.md AS-1).
// 공급자가 새 블록 타입을 내도 서버가 push한 응답이 다음 요청에서 거부되지 않도록
// 허용 목록 대신 위험한 것(이미지·문서·파일·cache_control)만 막는다.

/**
 * 객체 트리를 훑어 금지된 키나 블록 타입이 있는지 본다.
 * 도구 입력(input·args)은 모델이 만든 데이터라 키 이름을 검사하지 않는다.
 * @param {*} node
 * @param {object} rules
 * @param {Set<string>} rules.blockedKeys 있으면 거부할 키
 * @param {Set<string>} rules.blockedTypes 있으면 거부할 `type` 값
 * @param {Set<string>} rules.skipKeys 내려가지 않을 키
 * @return {boolean} 금지 항목이 있으면 true
 */
const containsBlocked = (node, rules) => {
  if (Array.isArray(node)) {
    return node.some((n) => containsBlocked(n, rules));
  }

  if (!node || typeof node !== "object") {
    return false;
  }

  if (typeof node.type === "string" && rules.blockedTypes.has(node.type)) {
    return true;
  }

  return Object.entries(node).some(([k, v]) => rules.blockedKeys.has(k) ||
    (!rules.skipKeys.has(k) && containsBlocked(v, rules)));
};

const ANTHROPIC_RULES = {
  roles: new Set(["user", "assistant"]),
  blockedKeys: new Set(["cache_control"]),
  blockedTypes: new Set([
    "image",
    "document",
    "search_result",
    "container_upload",
  ]),
  skipKeys: new Set(["input"]),
};

const GEMINI_RULES = {
  roles: new Set(["user", "model"]),
  blockedKeys: new Set([
    "inlineData",
    "fileData",
    "executableCode",
    "codeExecutionResult",
    "cache_control",
  ]),
  blockedTypes: new Set(),
  skipKeys: new Set(["args"]),
};

export const isValidAnthropicMessage = (message) =>
  ANTHROPIC_RULES.roles.has(message.role) &&
  (typeof message.content === "string" || Array.isArray(message.content)) &&
  !containsBlocked(message.content, ANTHROPIC_RULES);

export const isValidGeminiMessage = (message) =>
  GEMINI_RULES.roles.has(message.role) &&
  Array.isArray(message.parts) &&
  !containsBlocked(message.parts, GEMINI_RULES);

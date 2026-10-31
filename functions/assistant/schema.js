// 도구 JSON 스키마를 공급자 제약에 맞춰 정리한다(앱 레포 specs/Assistant.md AS-4).
// 빼는 키워드의 제약은 도구 설명에 같은 내용이 적혀 있어 동작은 같다.

/**
 * 스키마에서 주어진 키워드를 재귀적으로 뺀다.
 * @param {object} node JSON 스키마
 * @param {Set<string>} dropKeys 뺄 키워드
 * @return {object}
 */
export const sanitizeSchema = (node, dropKeys) => {
  if (Array.isArray(node)) {
    return node.map((n) => sanitizeSchema(n, dropKeys));
  }

  if (!node || typeof node !== "object") {
    return node;
  }

  const out = {};

  for (const [k, v] of Object.entries(node)) {
    if (dropKeys.has(k)) {
      continue;
    }

    // properties 아래 키는 속성 이름이라 지우지 않고, 각 속성 스키마만 정리한다.
    out[k] = k === "properties" && v && typeof v === "object" ?
      Object.fromEntries(Object.entries(v)
          .map(([name, schema]) => [name, sanitizeSchema(schema, dropKeys)])) :
      sanitizeSchema(v, dropKeys);
  }

  return out;
};

// Gemini parametersJsonSchema가 받지 않는(버전에 따라 거부하는) 키워드.
export const GEMINI_UNSUPPORTED_KEYS = new Set([
  "additionalProperties",
  "pattern",
  "maxLength",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
]);

// Anthropic strict 도구 스키마가 지원하지 않는 숫자·길이·패턴 제약.
export const ANTHROPIC_STRICT_UNSUPPORTED_KEYS = new Set([
  "minimum",
  "maximum",
  "maxLength",
  "minItems",
  "maxItems",
  "pattern",
]);

// SAMAYA (samaya-equipment.com) — 프랑스 경량 산악 브랜드 (Shopify)
// 스펙은 제품 페이지 metafield-rich_text_field 블록(프랑스어)에 서버렌더.
// 실제 크롤/파싱은 samaya-global.py 가 담당(curl + 메타필드 파싱) → out/samaya-FINAL.json.
// 이 어댑터는 crawl.js --from-json 으로 에디터를 띄울 때 name/company 메타용 최소 구현.

export default {
  name: 'samaya',
  company: 'samaya',
  baseUrl: 'https://www.samaya-equipment.com',
  defaultCategories: [],
  crawl: async () => [],
};

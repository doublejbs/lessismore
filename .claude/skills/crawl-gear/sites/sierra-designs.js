// 시에라디자인 — 2소스 하이브리드. 실제 크롤은 standalone `sierra-designs.py`.
//   (A) sierra-designs.co.kr (Cafe24): 전 제품(의류+기어). 기어는 전용 카테고리(152~367)에 있음
//   (B) sierradesigns.com (Shopify): 기어 무게/스펙 추가
//   크롤:    python3 sierra-designs.py out/sierra-designs-FINAL.json
//   미리보기: node crawl.js sierra-designs --from-json=out/sierra-designs-FINAL.json
export default {
  name: 'sierra-designs',
  company: 'sierra-designs',
  companyKorean: '시에라디자인',
  baseUrl: 'https://sierra-designs.co.kr',
  defaultCategories: [],
  crawl: async () => {
    throw new Error('sierra-designs.py 로 크롤하세요');
  },
};

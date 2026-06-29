// Zpacks (zpacks.com) — Shopify 기반. 실제 크롤은 standalone `zpacks.py` 로 수행한다.
// products.json(리스팅·변형·무게 grams) + 백팩 상세 HTML(data-weight) 하이브리드라
// puppeteer 플로우(crawl.js) 대신 파이썬을 쓴다.
//   크롤:    python3 zpacks.py out/zpacks-FINAL.json
//   미리보기: node crawl.js zpacks --from-json=out/zpacks-FINAL.json
// crawl.js 는 --from-json 미리보기 시 이 어댑터를 import 만 한다(crawl 미사용).
export default {
  name: 'zpacks',
  company: 'zpacks',
  companyKorean: '지팩스',
  baseUrl: 'https://zpacks.com',
  defaultCategories: [],
  crawl: async () => {
    throw new Error('Zpacks 는 zpacks.py 로 크롤하세요: python3 zpacks.py out/zpacks-FINAL.json');
  },
};

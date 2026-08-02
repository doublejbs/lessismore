// 엑스패드 — 2소스 하이브리드. 실제 크롤은 standalone `exped.py`.
//   (A) exped.co.kr (Cafe24): 전 제품(한글명·사이즈옵션·이미지). 무게는 이미지에만.
//   (B) www.exped.com/en: 제품 페이지 h4/div 스펙(Weight/Max.Weight/R-Value/Temperature) → 음역+숫자 매칭.
//   크롤:    python3 exped.py out/exped-FINAL.json
//   미리보기: node crawl.js exped --from-json=out/exped-FINAL.json
export default {
  name: 'exped', company: 'exped', companyKorean: '엑스패드',
  baseUrl: 'https://exped.co.kr', defaultCategories: [],
  crawl: async () => { throw new Error('exped.py 로 크롤하세요'); },
};

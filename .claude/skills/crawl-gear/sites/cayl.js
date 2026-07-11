// 케일(CAYL) — Cafe24 단일소스(cayl.co.kr). 실제 크롤은 standalone `cayl.py`.
//   색상=별도 product_no(이름 말미 ' / Color'), 사이즈=상세 옵션 <li title>, 무게/용량=텍스트.
//   shoes/129(타브랜드) 제외. 소재는 이름 괄호(xpac/cordura/grid) + 원단 라인.
//   크롤:    python3 cayl.py out/cayl-FINAL.json
//   미리보기: node crawl.js cayl --from-json=out/cayl-FINAL.json
export default {
  name: 'cayl', company: 'cayl', companyKorean: '케일',
  baseUrl: 'https://cayl.co.kr', defaultCategories: [],
  crawl: async () => { throw new Error('cayl.py 로 크롤하세요'); },
};

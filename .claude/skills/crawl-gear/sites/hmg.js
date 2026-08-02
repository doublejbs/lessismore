// 하이퍼라이트마운틴기어(HMG) — Cafe24 한국공식. 실제 크롤은 standalone `hmg.py`.
//   SPECS&DIMENSIONS 텍스트 블록에서 볼륨별 소재·색상별 무게 파싱. 셸터는 인원수(capacity).
//   크롤: python3 hmg.py out/hmg-FINAL.json  ·  미리보기: node crawl.js hmg --from-json=out/hmg-FINAL.json
export default { name:'hmg', company:'hmg', companyKorean:'하이퍼라이트마운틴기어',
  baseUrl:'https://hyperlitemountaingear.co.kr', defaultCategories:[],
  crawl: async () => { throw new Error('hmg.py 로 크롤하세요'); } };

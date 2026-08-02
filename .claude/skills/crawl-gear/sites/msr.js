// MSR — 한국 공식 수입사(msrgear.co.kr, WooCommerce/Avada). MSR+써마레스트+플래티퍼스+팩타월.
// 실제 크롤은 standalone `msr.py`. 카드 .product-title 에 EN/KO 이름, 스펙은 텍스트(중량·용량·수용인원).
//   크롤: python3 msr.py out/msr-FINAL.json  ·  미리보기: node crawl.js msr --from-json=out/msr-FINAL.json
export default { name:'msr', company:'msr', companyKorean:'엠에스알',
  baseUrl:'http://www.msrgear.co.kr', defaultCategories:[],
  crawl: async () => { throw new Error('msr.py 로 크롤하세요'); } };

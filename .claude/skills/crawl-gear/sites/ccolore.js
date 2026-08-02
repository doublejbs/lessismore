// 꼴로르(CCOLORE) — Cafe24 한국공식(ccolore.com). 초경량 다운 침낭/퀼트 + 실타프·텐트·다운의류.
// 실제 크롤은 standalone `ccolore.py`. 측정표(사이즈별 Full Weight/Fill Weight)+온도(N℃/N℃/N℃)+필파워 파싱.
//   크롤: python3 ccolore.py out/ccolore-FINAL.json  ·  미리보기: node crawl.js ccolore --from-json=out/ccolore-FINAL.json
export default { name:'ccolore', company:'ccolore', companyKorean:'꼴로르',
  baseUrl:'https://ccolore.com', defaultCategories:[],
  crawl: async () => { throw new Error('ccolore.py 로 크롤하세요'); } };

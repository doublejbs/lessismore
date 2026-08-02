// 웨스턴마운티니어링(Western Mountaineering) — WooCommerce(www.westernmountaineering.com).
// 실제 크롤은 standalone `wm.py`. 침낭 무게/온도/충전, 의류 사이즈까지 WooCommerce attributes 표에서 파싱.
//   크롤:    python3 wm.py out/wm-FINAL.json
//   미리보기: node crawl.js wm --from-json=out/wm-FINAL.json
export default {
  name: 'wm', company: 'western-mountaineering', companyKorean: '웨스턴마운티니어링',
  baseUrl: 'https://www.westernmountaineering.com', defaultCategories: [],
  crawl: async () => { throw new Error('wm.py 로 크롤하세요'); },
};

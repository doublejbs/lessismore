# 씨투써밋 (sea-to-summit)

- **글로벌**: https://seatosummit.com  (Shopify)
- **한국(한글명)**: seatosummit.co.kr (수입사 니오) — 상세에 **영문 모델명 있음**(매칭 쉬움)
- 크롤러: `sites/sea-to-summit.js`, 한글화 `kr-reference.js`+`kr-apply.js`+`kr-match.js`

## ⚠️ 주의사항
1. 리스팅·무게: `products.json` variants `grams`. 단 grams(배송무게) 대신 **스펙 테이블 값** 우선.
2. **무게/스펙은 변형 인덱스가 아니라 "스펙 컬럼 헤더"(사이즈/온도)로 매핑** — 인덱스로 읽으면 색상 변형이 다 어긋남.
3. 변형(사이즈·색상·온도)별 개별 행. 사이즈를 영문 name 끝에 부착. One Size/Default 는 사이즈 없음.
4. 색상별 이미지는 `variant.featured_image.src`.
5. 한글화: KR 수입사 상세의 영문 모델명으로 매칭 → 공식명 verbatim, 못 찾으면 음역(℉→℃ 등).

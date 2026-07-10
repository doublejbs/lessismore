# 니모 (nemo)

- **글로벌**: https://www.nemoequipment.com  (Shopify — 스펙/무게 소스)
- **한국**: https://www.nemoequipment.co.kr  (고도몰 — 한글명/한국한정 제품)
- 크롤러: `nemo-global.py`(스펙 빌더), `nemo-variants.py`(변형 정규화), `nemo-kr-apply.py`(침낭/매트 한글명)
- 마지막 크롤: 2026-06, 240개

## ⚠️ 주의사항
1. **무게는 Packed Weight 우선** (Minimum/트레일 아님). Shopify `grams` 는 검증 후 사용.
2. **변형별 이미지는 개별 product.json 의 `variant.image_id`** 로 (색상뿐 아니라 사이즈 변형도 각자 이미지).
3. **색상 전용 옵션 제품(체어/베개/더플)은 변형 라벨이 색상** → products.json options 축(Color/Size)으로 판별.
   무조건 size 로 넣으면 색상이 size 로 누출됨.
4. **Shopify+Cloudflare WAF 403** → python urllib 막힘 → curl(브라우저 UA) 로 우회 + 429 백오프.
5. 한국 한정 제품(조르/오라 NX 매트, 타니/아톰 텐트)은 글로벌에 없음 → 한국 상세 이미지 OCR 별도 수집.
6. 침낭/매트 한글명은 니모 코리아 공식 표기 형식(℉+EP 등)으로. 색상/사이즈 음역, ℉→℃ 변환.

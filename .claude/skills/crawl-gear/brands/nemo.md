# 니모 (nemo)

- **글로벌**: https://www.nemoequipment.com  (Shopify — 스펙/무게 소스)
- **한국**: https://www.nemoequipment.co.kr  (고도몰 — 한글명/한국한정 제품)
- 크롤러: `nemo-global.py`(스펙 빌더), `nemo-variants.py`(변형 정규화), `nemo-kr-apply.py`(침낭/매트 한글명)
- 마지막 크롤: 2026-06, 240개

## ⚠️ 주의사항
1. **무게는 Packed Weight 우선** (Minimum/트레일 아님). Shopify `grams` 는 검증 후 사용.
2. **변형별 이미지는 개별 product.json 의 `variant.image_id` → `images[].id`** 로 (색상뿐 아니라 사이즈 변형도 각자 이미지).
   컬렉션 products.json 은 variant 에 featured_image/image_id 가 **전부 None**(NEMO) → 개별 `/products/<slug>.json` 필요.
   `images[].variant_ids` 로 역매핑도 가능. 매핑 없는 제품(폼매트·풋프린트)만 og:image 폴백. **한 제품에 이미지 한 장 일괄 금지.**
3. **색상 전용 옵션 제품(체어/베개/더플)은 변형 라벨이 색상** → products.json options 축(Color/Size)으로 판별.
   무조건 size 로 넣으면 색상이 size 로 누출됨.
4. **Shopify+Cloudflare WAF 403** → python urllib 막힘 → curl(브라우저 UA) 로 우회 + 429 백오프.
5. 한국 한정 제품(조르/오라 NX 매트, 타니/아톰 텐트)은 글로벌에 없음 → 한국 상세 이미지 OCR 별도 수집.
6. 침낭/매트 한글명은 니모 코리아 공식 표기 형식(침낭 `리프 맨 15 EP 레귤러`=모델+℉+EP+사이즈, 매트 `텐서 올 시즌 레귤러/와이드`)으로.
   **KR 카탈로그가 일부만 노출되면 strict verbatim 은 한 제품 안에서 표기가 섞인다**(매칭분 "15 EP" vs 미매칭분 "-9℃") →
   매칭 샘플로 공식 형식을 학습해 전 변형에 일관 생성, KR 노출명과 일치율 검증. nameKorean 은 `℉` 유지, sizeKorean 은 `℃` 변환.
7. **push 전 KR-전용 행의 `_source` 를 `nemo_<category>` 로 분리.** 여러 KR 소스가 같은 `_source`
   문자열을 쓰면 `push.js` 가 그 source 첫 항목 카테고리로 전부 덮어씀(mat+tent 혼합 → 전부 mat).
   글로벌 크롤은 firebase-admin 때문에 **Node 20**(`/opt/homebrew/opt/node@20/bin/node`)으로 push.
8. **한국·일본 한정 제품(§5)은 영문화 단계가 통째로 빠지기 쉽다.** 2026-07 세션에서 실제로 겪음
   — 오라/조르 NX(매트), 타니/아톰 오스모(텐트) 11건이 Firestore에 `name`(영문) 완전 공백,
   `size` 필드에도 영문 대신 한글 텍스트가 그대로 들어가 있었음(예: `size="레귤러/와이드"`).
   글로벌에 없는 제품이라도 **모델의 실제 영문 정식명은 웹 검색으로 확인 가능한 경우가 많다**
   (Aura NX/Zor NX/Tani OSMO/Atom OSMO 전부 실존 NEMO 라인업, 로마자 음역 대신 이걸 우선 사용).
   `size`는 반드시 영문(Regular Wide 등)으로, 인원수처럼 이미 로마자인 값(`1P`/`2P`)은 그대로 둬도 무방.
9. **같은 모델의 사이즈 변형이 `nameKorean`에서 구분 안 되는 사고 있었음(로머/Roamer 매트).**
   Single/Double/Single Wide/Double Wide 4개 변형인데 `nameKorean`이 "로머"/"로머 와이드" 2종류뿐이었음
   (사이즈 단어가 이름에 안 붙음). 매트류는 `nameKorean`에 `sizeKorean` 텍스트를 붙이는 게 기본 컨벤션
   (예: "텐서 트레일 레귤러/머미") — 새 매트 어댑터 작성 시 이 패턴 누락 여부를 반드시 확인.
   (침낭은 예외: `nameKorean`은 `℉`+EP 표기, `sizeKorean`은 `℃` 변환이라 서로 텍스트가 다른 게 정상.)

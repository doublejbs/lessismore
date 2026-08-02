# 쓰리에프 UL기어 (3f-ul-gear)

- **사이트**: https://3fulgear.com  (WooCommerce — 공개 Store REST API `/wp-json/wc/store/v1/`로 카테고리·
  상품·변형·이미지·가격 전부 구조화 JSON. puppeteer 불필요, fetch만으로 크롤)
- 크롤러: `sites/3f-ul-gear.js`
- 마지막 크롤: 2026-07, 237개 (tent 52 · tent_acc 66 · backpack 30 · clothing 27 · stove 26 ·
  etc 14 · tarp 8 · pouch 8 · backpack_cover 3 · trekking_pole 2 · gaiter 1). 무게 147/237(62%).
- companyKorean: 쓰리에프 UL기어. 한국 공식 유통 없음(검색 확인 — 마켓플레이스 재판매만) →
  nameKorean/colorKorean은 사전 기반 부분 음역.

## ⚠️ 주의사항

1. **스펙(무게/소재/치수)은 API 필드가 아니라 `description` HTML 텍스트에 있다.** WooCommerce
   `weight`/`dimensions` 필드는 이 사이트가 항상 빈값으로 둠(변형별로도 마찬가지) — 상품
   description 안의 "SPECS"/"BASICS"/"Specifications" 섹션 텍스트를 정규식으로 파싱.
2. **무게 라벨이 상품군마다 다르다**: TRAIL WEIGHT(경량 텐트) / MINIMUM WEIGHT(대형 쉘터) /
   PACKED WEIGHT / 단순 WEIGHT. 우선순위 리스트로 첫 매치 채택.
3. **"다음 라벨 시작"을 대문자 2글자만으로 판별하면 값이 잘린다.** "15D Nylon with PU coating"
   같은 값 안의 약어("PU")도 대문자 2글자라 오검출됨 — 실제 라벨은 항상 "대문자 단어 연속
   2개 이상"(FLY MATERIALS 등)이므로 그 패턴만 라벨 경계로 인정한다(`NEXT_LABEL_LOOKAHEAD`).
4. **변형 축이 상품마다 다르고, 색상 축 이름이 "Color"가 아니라 "OPTION"인 경우가 흔하다.**
   같은 "OPTION" 축 값 안에 색상+시즌이 압축돼 있고("Khaki - 3 season"), 축이 3개까지도 있다
   (Materials+Size+Color). 축 이름이 아니라 **값 자체**로 색상(`COLOR_WORDS` 키워드 매치)·시즌
   (`\d[- ]season`)을 뽑고 나머지를 size로 합친다. 축 하나만 고르면 다른 축이 조용히 사라져
   서로 다른 변형이 "같은 size"로 뭉개진다(실측: Tarp Pole은 LENGTH+DIAMETER 2축).
5. **같은 "옵션" 축에 색상/시즌이 아니라 완전히 다른 부속품이 섞여 있다** (Footprint, Dual-Pole
   Clips & Extra Pole, TPU Transparent Door 등 — Beetle16 2.0의 OPTION 축이 대표 사례:
   MAIN TENT KIT/EXTEND PART/FOOTPRINT 등). 이런 값을 색상/사이즈 변형처럼 취급해 본품(텐트)
   무게를 그대로 물려주면 완전히 틀린다(풋프린트가 텐트 전체 무게로 찍히는 사고). `ACCESSORY_VALUE_RE`
   로 감지해 category를 `tent_acc`로 바꾸고, "ACC WEIGHT" 섹션에서 그 부속품 전용 무게를 따로
   찾는다(없으면 0 — 텐트 무게를 대신 넣지 않는다).
6. **카테고리 자체가 섞여있다**: `ultralight-tent`/`freestanding-tent` 안에 풋프린트 액세서리,
   `accessories` 안에 텐트폴/스토브/트레킹폴 등. `classify()`가 카테고리 슬러그보다 상품명
   키워드를 우선한다.
7. **서비스/수수료/위생용품이 상품처럼 리스팅돼 있다** (shipping cost, customised
   products/shipping, seam sealing service, personal hygiene) — `EXCLUDE_RE`로 제외.
8. **`_source`에 카테고리를 포함시켜야 한다 (push.js 호환 필수).** `push.js`는 `_source`로
   묶어 그 안의 **전 행을 하나의 카테고리로 강제 덮어쓴다**(대화형/비대화형 모두
   `items[0].category`를 기본값으로 사용). 이 브랜드는 한 리스팅 페이지 안에 카테고리가
   진짜로 섞여있어서(예: freestanding-tent 페이지에 tent 24개 + tent_acc 18개) `_source`를
   카테고리 없이 두면 섞인 행 전부가 하나로 뭉개진다 — push 직전 dry-run으로 처음 발견.
   `_source`를 `.../product-category/<slug>/#<category>` 형태로 만들어 push.js 그룹이 항상
   단일 카테고리가 되게 했다. **이 사이트 패턴(리스팅 하나에 카테고리 혼재)을 쓰는 다른
   브랜드도 같은 처리 필요.**
9. **모델명에 숫자가 바로 붙는 경우 음역 사전이 안 먹는다** ("Shell2"·"Beetle16" — 사전 키가
   "shell"/"beetle"라 "shell2" 자체는 안 걸림, nameKorean이 통째로 미번역으로 남았던 버그).
   사전 조회 전에 끝의 숫자를 단어에서 분리(`splitTrailingDigits`).
10. **`firebase-admin`(push.js)이 기본 Node(v26)에서 깨진다** — `buffer-equal-constant-time`
    패키지가 제거된 `SlowBuffer`를 참조. 니모 세션에서 확립한 대로 **Node 20**
    (`/opt/homebrew/opt/node@20/bin/node`)으로 push 실행.
11. 색상 옵션이 있는 상품(대부분 텐트/쉘터)만 color/colorKorean 채움 — 백팩(사이즈만),
    액세서리(대부분 옵션 없음)는 빈 문자열.

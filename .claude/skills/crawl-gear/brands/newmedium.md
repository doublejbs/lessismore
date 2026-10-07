# 뉴미디엄 (newmedium.kr/outside)

- 사이트: https://www.newmedium.kr/outside — **식스샵(sixshop) 기반 멀티브랜드 편집숍**. OUTSIDE 카테고리 4개
  (Pack 932421 / Sleep 976805 / Clothing 932429 / Acc 932428).
- 크롤러: `sites/newmedium.js`. 별도 한글화 스크립트 없음(상세 페이지에 공식 한글명이 있음).
- 마지막 크롤: 2026-10, 리스팅 216개 → 대상 188개 상품 / 383행. validate ERROR 0.

## 수집 범위 (사용자 결정)

- **SOTO·Gossamer Gear·Samaya 제외**(공식몰 어댑터로 이미 수집, 2026-09-30) — `EXCLUDE_BRAND`.
- **품절·가격 0원 단종품·비장비(커피·스티커·쿠션 등)도 전부 수집**(2026-09-30).
- DB에 사용자 입력분이 있던 브랜드(2026-10 대조, 규칙: 제품명+사이즈+색상이 같으면 안 올림):
  - **Malachowski Ultralight III 500 L/XL** — DB `울트라라이트 3 500 L/XL`과 동일 → 제외(`EXCLUDE_NAME`).
  - **Pa'lante V2 Pack** — DB는 31L/37L(색상 없음). 색상이 다르면 전부 올림(사용자 결정).
  - **SEALSON UNUS52** — DB 1건(black, 사이즈 없음). 전부 올림(사용자 결정).
  - Mountain Hardwear Scrambler Pack — DB에 없음 → 올림.
- company·companyKorean은 **DB 기존 등록 표기로 통일**(사용자 결정 2026-10-07): `Pa'lante | 파란테`, `SEALSON | 씰슨`,
  `Mountain Hardwear | 마운틴하드웨어`. 사이트 표기(팔란테·실슨)는 쓰지 않고, 기존 문서도 바꾸지 않는다.

## API / 구조

- 리스팅: `GET /apis/mall/shop/products-catalog?page=N&npp=100&categories=…&customerGradeNo=-2&orderType=PRODUCT_ORDER_NO&useSortedBySoldOutAllPage=use&customerNo=0`
  — **헤더 `Authorization: Basic OTI5MTg=` 필수**(사이트 ID 92918). curl로 바로 받아짐.
  - `thumbnails` = 상품 사진 목록(순서대로). `shopProductOptions[].optionImageSequence` = 그 목록의 순번(색상 옵션 이미지).
  - 이미지 호스트는 `https://contents.sixshop.com` + thumbnails 경로(`www.newmedium.kr`는 302).
- 상세: `/product/<address>` 서버렌더 HTML.
  - ⚠ **한글명**: 영문명이 페이지에 두 번 나온다(첫 번째는 제목, 다음 줄이 브라우저 경고문). 상세 설명의
    **「관련 상품」 다음 줄 = 영문 제목, 그다음 줄 = 한글명**. 한 줄에 영문+한글이 붙은 경우도 있음.
    한글명이 아예 없는 상품(윈드스로우 티타늄 컵·캠프 머그)은 `KO_OVERRIDE`로 음역.
  - 스펙은 `+`로 시작하는 줄(소재, `173 g (M 사이즈 기준)` 등).
  - **옵션**: `<div class='custom-select-option' data-option-index='0|1' data-option-value=… data-combined-option-value-no=…>`.
    두 번째 축(index 1)은 combined가 `"색상번호, 사이즈번호"`라 리스팅 `optionValueNo1/2`와 짝지을 수 있다.

## 브랜드·이름·색상

- 브랜드 필드가 없어 **이름 앞부분으로 판별**(`BRANDS`). groupId 접두는 회사 슬러그(멀티브랜드 룰).
  콜라보(`Rayon Vert x Sealson`, `Matter Of & Velo Temp`)는 회사=앞 브랜드, 이름 끝에 `(… Collab)` / `(… 콜라보)`.
- 제품명에서 브랜드명 제거(영문·한글 모두). 상품명에 브랜드가 들어간 문구(`'Therefore I GoLite' Grocery bag`)는
  `EN_OVERRIDE`로 `Grocery Bag`.
- **색상은 대부분 이름 끝**(`… Jacket Black Beauty`) → `COLOR_KO` 최장 꼬리 일치로 분리. 한글명 끝의 색상은 사이트
  표기 그대로 colorKorean(리첸·옐로우·크러쉬처럼 사전과 달라도 사이트 우선 — `KO_COLOR_WORDS`에 등록).
  영문 색상보다 한글이 짧으면(Black Robic ↔ 블랙) 사전 번역. 전부 대문자 색상(`BLACK`, `TABAK`)은 첫 글자만 대문자로.
- 사이트 한글명이 틀린 상품은 `KO_OVERRIDE`(터틀팩 블랙 로빅 = 사이트엔 '글래시어', RB36 화이트 = 사이트엔 '스톰 화이트').
- `+ Foam Pad` / `+ joey straps` 구성품은 색상이 아니라 이름에 남긴다(`Desert Pack + Foam Pad`, `데저트 팩 + 폼패드`).
- 팔란테 등판 사이즈 `16" 등판 40cm, 31L` → `16" Torso 40cm / 31L` · `16인치 등판 40cm 31L`. 용량이 빠진 롱 사이즈
  (`19" 등판 48cm long`)는 같은 인치 형제 사이즈의 용량을 붙인다.

## 무게

- **상세 `+` 스펙 줄 우선, 리스팅 description은 보조**(description 복붙 오류: Carbon Fiber Spool 30g vs 스펙 4.5g,
  Drift Merino LS T 120g vs 140g).
- 패턴: 사이즈별 `xs-xl: 235, 249, 263, 292, 323 g` / 키별 `S:12g, L:24g`, `Black 106g / Brindle 114g`,
  `3 ml (8.5 g) / 15 ml (20 g)` / 위치별(무게 개수 = 옵션 수) `250g / 350g`, `10.1g, 18g` /
  세트 구성(치수와 함께) `손수건 … 34g / 파우치 … 7g` → **합산** / `총 3g` / `패치 당 0.28g` × `12매입`.
- ⚠ `Approx.184g`의 `.184`를 숫자로 잡지 않게 `\d+(\.\d+)?`. 위치 매칭은 g 개수가 옵션 수와 같을 때만
  (`31/37L, 510g`의 31을 무게로 오인한 적 있음).
- 텍스트에 무게가 없던 18개 상품은 **상세 이미지·상품 사진 254장 전부 Vision OCR**(2026-10). 찾은 것:
  윈드스로우 인스턴트 커피 = 포장지 "5g PACKET" × "상자당 6개" → 30g(`WEIGHT_OVERRIDE`).
  OCR 오탐 주의: 포탈 Passage Cargo Vest 사진의 `40g`은 주머니 속 에너지바 포장지, 워크 글로브의 `900g`은 무늬 오인식.
- 나머지 17개 상품은 **데이터 미존재 확정**(뉴미디엄 상세 텍스트·이미지 OCR, 포탈 공식몰 portal-brand.com,
  윈드스로우 공식몰 windthrow.store, 라살 기어 공식몰까지 확인. 공식몰 Shopify `grams`는 배송무게라 미사용 —
  같은 Passage Cargo Vest가 250g/91g으로 다름): 윈드스로우 의류·토트·스티커, 포탈 Passage Cargo Vest,
  워크 글로브, 라살 비니·벨트 2, 고라이트 그로서리 백, 호보 보틀.

## 카테고리

- backpack: Pack/Backpack/Fastpack/PAC-Lite/PAC-bit · vest_pack: Passage Cargo Vest(10L) · pouch: 크로스바디·사코슈·
  파우치·사이드백·카메라 숄더·초크 버킷·트래시 백·토트·그로서리 백 · clothing: 재킷·베스트·후디·티·셔츠·팬츠·쇼츠·
  스커트·양말·비니·모자·벨트·언더·하라마키·망토 · gloves · bottle: 보틀·물통·스루보틀·베시카 · cup: 컵·머그 ·
  cookware: Pot Hopper(핸드오프 §3 'pot') · cookware_etc: Fuel Stand(§3 어느 규칙에도 안 걸림) · tent_acc: 반사 코드·카본 스풀 · towel: 테누구이 ·
  furniture_etc: 쿠션 · food: 커피 · etc: 패치·리페어·스트랩·밴드·스티커·연고·바이트밸브·스틱 스태셔·코르크 볼 등.

재실행: `node crawl.js newmedium --no-open` → `node validate.js out/newmedium-<ts>.json` → 검토 → push(node@20 push.js).

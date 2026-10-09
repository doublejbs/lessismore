# 파고웍스 (paagoworks.com)

- 사이트: https://www.paagoworks.com — **Shopify 스토어**, 일본어(일본 UL 브랜드 PAAGO WORKS).
  리스팅/변형/이미지는 `products.json`, 무게·스펙은 상품페이지 서버렌더 스펙표(라벨/값 쌍)에서.
- 크롤러: `sites/paagoworks.js`. **별도 한글화 스크립트 없음** — 어댑터가 일본어 제목→영문 `name`,
  한글 `nameKorean`/소재/색상까지 바로 만든다.
- 국내 공식 수입사 없음(2026-10 확인). 보즈만(bozeman.kr) 0건, 굿러너(goodrunner.co.kr)에 RUSH 계열 14개만
  ("파고웍스 공용 러쉬 3R …") → RUSH는 **"러쉬"** 표기 채택, 나머지는 음역.
- 마지막 크롤: 2026-10, 91개 상품/189행(룰 전수 감사 통과). company=`PAAGO WORKS`, companyKorean=`파고웍스`. validate ERROR 0.
- 크롤 전 Firestore 기존 문서: **0건**(paago/パーゴ/파고 검색) → 첫 크롤은 전부 신규.

## 무게 — variants.grams 금지, 스펙표 「重量」

- ⚠ `variants[].grams`는 배송무게(ALK 16/24/30 전부 1100, ZENN 25/35/45 전부 1000, 소품은 16g 기본값).
- 실제 무게는 상품페이지 스펙표 `重量` 행. `body_html`엔 없다. curl로 바로 읽힘(퍼피티어 불필요).
- 포맷과 규칙(사용자 결정 2026-09-30):
  - 단일 `約670g` / `1160g（最小重量）` / `1770g（付属品込み）` → 그 값
  - 본체+부속 `本体：785g、デタッチャブルポケット：85g、ヒップハーネス：130g` → **본체만**
  - 세트(키 없음) `68g（チタンカップ）、30g（シリコンキャップ）` → **합산**(쿡웨어/컵만)
  - 변형별(키) `M：122g` / `PC Light Gray / PC Black ：75g` / `Sサイズ：35g` / `Normal:350g（2本）　SL:300g`
    → 옵션값의 구별 토큰과 키 매칭. **정확 일치 먼저, 그다음 꼬리 일치**("DRY SACK 1"↔"1").
    순서를 바꾸면 색상 `Gray`가 `PC Light Gray` 키에 걸린다.
- ⚠ **반올림 금지**(SKILL 룰) — `16.5g`/`25.5g`/`68.5g` 그대로. 합산만 소수 1자리 정리.
- 스펙표가 아예 없는 소품 9개는 무게 0 — **데이터 미존재 확정**(일문 페이지·영문 `/en/` 페이지·상품 이미지
  전량 Vision OCR·Gear Aid 공식몰까지 재시도, 2026-10). 대상: POPS Bag, Attachment, Shoulder Belt, Comfort Shoulder,
  ガイライン, ステンレスメッシュ, 火吹棒, 五徳トング, Seam Grip 리페어킷.

## 스펙

- 라벨: `サイズ / 重量 / 容量 / 主素材(素材) / 耐水圧 / 収容人数 / 背面長 / 付属品 / メーカー`.
  값 블록은 다음 라벨 또는 페이지 잔여 텍스트(`PRODUCTS`, `注意`, `関連記事`…)에서 끊는다.
- 容量: `本体：30L、デタッチャブルポケット：5L`은 **합계**(=35, 모델명 ZENN 35와 일치. 무게는 본체만인 것과 다름), 변형 키 매칭, 쿡웨어는 `満水容量500ml`/`1.2L`→ml. **숫자만 저장**.
- 主素材: 일본어 → `MATERIAL_JA` 사전으로 한글화(긴 것 먼저). 색상별 소재(`PC … ：PCコーティングナイロン`,
  구형 SWITCH는 한 줄에 `、`로 이어짐)는 해당 색 줄을 고른다. 사전에 없는 일본어가 남으면 크롤 중 `⚠ 소재 일본어 잔존` 경고.
- 텐트/쉘터: `収容人数`(2〜3人→최소값), `耐水圧`(2,000mm→2000), 主素材→flyMaterial.

## 카테고리 (handle 기준, `classify`)

- backpack: ZENN/ALK/BUDDY/CARGO/RUSH(3R 제외). **vest_pack: RUSH 3R만**(페이지가 직접 "ベスト"라 칭함).
- pouch: SWITCH/SNAP/PATHFINDER/FOCUS(숄더·카메라백), W-FACE, TRAIL BANK, DRY SACK, POPS, MY FIRST AID, RUSH HIP/PLUS, 메쉬백.
- tent: NINJA TENT / shelter: NINJA SHELTER, ZENN 2 POLE·DOME SHELTER / tarp: NINJA TARP(SP).
- tent_acc: NINJA NEST(타프/쉘터용 이너텐트), 펙 세트, 가이라인, SHURIKEN, NINJA STICK.
- 조리는 `crawl-pipeline-category-handoff.md` §3 규칙 준수: cookware: TRAILPOT, 그릴 플레이트 かるpan(팬) /
  cutlery: 五徳トング(집게/tong) / stove: NINJA FIRESTAND(화로대) / cup: TRAIL CUP(isSet)
  - ⚠ TRAIL CUP 옵션명 `500`/`300`은 **모델 구분명(S1200/S900에 들어가는 크기)이지 ml이 아니다.** 3종 세트
    (둥근 플라스틱 580/350, 콩 플라스틱 270/180, 티타늄 630/390ml) → **size·capacity = 최대인 티타늄 컵 용량**
    `630ml`/`390ml`(사용자 결정 2026-10). 모델 숫자는 이름에 남겨 `TRAIL CUP 500 / 630ml` · `트레일 컵 500 630ml`.
  - 같은 원칙(**숫자 사이즈 = 실제 용량**)을 ZENN DRY SACK EXP에도 적용: 옵션 `1/4/8` → `ZENN DRY SACK EXP 8 / 8.5L`.
    S/M/L/XL·Normal/SL처럼 용량으로 읽히지 않는 사이즈 등급은 그대로 둔다.
- etc: 하네스·스트랩·슬리브·벨트·어태치먼트, RUSH 폴 홀더, 火吹棒, 스테인리스 메쉬, 심그립 킷.
- `_source = paagoworks_<category>`로 push.js의 source별 카테고리 일괄 적용과 1:1 유지.

## 타사 셀렉트 상품 (`cat-selected` 태그, vendor로 구분 불가)

- **Carry the Sun Warm Light 제외**(`EXCLUDE`) — DB에 `Carry the Sun | Solar Portable Light S/M`로 이미 있음.
  (참고: DB 기존 행은 S=86g/M=57g로 뒤바뀜. 실제 Small 57g, Medium 86g.)
- Big Forest `Grill Plate かるpan`, Gear Aid `Seam Grip WP Field Repair Kit`는 DB에 없어 포함,
  **company는 실제 제조사**(`THIRD_PARTY`: Big Forest/빅포레스트, Gear Aid/기어에이드).
- NINJA FIRESTAND Solo, CARGO 55도 `cat-selected` 태그지만 파고웍스 자사 제품.

## 변형·이름

- ⚠ **제품명에 브랜드명 금지**(사용자 지적 2026-10) — `nameKorean`에 "파고웍스"/"빅포레스트" 접두 붙이지 않는다(회사는 companyKorean).
- ⚠ **한글명은 모델명까지 한글 음역**(사용자 지적 2026-10): ZENN→젠, RUSH→러쉬, SNAP→스냅, SWITCH→스위치, ALK→알크,
  BUDDY→버디, NINJA→닌자, TRAILPOT→트레일팟, W-FACE→더블페이스, BC→백컨트리 … 영문 유지는 숫자 섞인 코드
  (3R/11R/R500/S1200P/V2)·사이즈 글자(S/M/L/XL)·시리즈 약어(EXP=BUILT TO EXPLORE 라인, SP, WP)만. 사전에 없는
  토큰은 크롤 중 `⚠ 한글명 미번역 토큰` 경고. validate.js는 "한글 0자"만 FLAG라 영문 섞임을 못 잡으니 눈으로 확인.
- ⚠ **배낭 size = 용량**(사용자 지적 2026-10, 기존 DB HMG 관례 `40L`): backpack/vest_pack은 사이즈 옵션이 없으면
  `size`/`sizeKorean` = `"<volume>L"`.
- ⚠ **사이즈는 예외 없이 이름 끝에 부착**(SKILL 변형 룰): `FOCUS / M` · `포커스 미디엄`, 배낭도 `ZENN 35 / 35L` ·
  `젠 35 35L`. 처음에 "모델명 숫자와 중복"이라며 배낭만 빼먹었다가 사용자 지적(2026-10) — 룰에 없는 예외를 만들지 말 것.
- 이미지: `images[].variant_ids` 직접 매칭 → `featured_image` → 대표(SAMAYA 룰). 사이즈 변형도 각자 이미지.
- 타사 셀렉트 상품 groupId 접두는 제조사(`big-forest_`, `gear-aid_`) — 멀티브랜드 룰.

- 색상축: `Color/色/Colour/color` + **값이 전부 색상명인 축**(ガイライン은 축 이름이 Size인데 값이 Yellow/Gray).
- 사이즈축: `Size/サイズ/スタイル`. 표시값은 형제 값과 공통 토큰을 뺀 구별 토큰
  (`SWITCH M EXP`→M, `TRAIL CUP 500`→500, `M Size`→M, `NINJA STICK`→Normal).
- 구형 모델 **전부 포함**(사용자 결정): `(2025年モデル)`→`(2025 Model)`/`(2025년 모델)`, `（旧モデル）`/`旧 `→`(Old Model)`/`(구형 모델)`.
- 모델 코드(ZENN/RUSH/SNAP/SWITCH/ALK/BUDDY/NINJA/TRAILPOT/W-FACE/EXP/SP…)는 한글명에서도 영문 유지.

- ⚠ push는 **`node@20 push.js <json>`(CLI)** 로. HTML 편집기 "Firestore 저장"(server.js)은 `_detailUrl`→`productUrl`
  매핑이 없어 productUrl이 빈 값으로 올라간다(2026-10 발견).

재실행: `node crawl.js paagoworks --no-open` → `node validate.js out/paagoworks-<ts>.json` → 검토 → push(node@20).

# 고싸머기어 (gossamergear.com)

- 사이트: https://www.gossamergear.com — **Shopify 스토어**(미국 UL 백패킹 브랜드). 리스팅/변형/이미지는
  `products.json` API, 무게는 상품페이지 서버렌더 `<legend>`에서.
- 크롤러: `sites/gossamer-gear.js`, 한글화: `gossamer-gear-kr-apply.js`
- 마지막 크롤: 2026-08, 129개 상품/224행. 무게 107/129(83%). 규칙 준수: ERROR 0(validate.js).

## Shopify 구조

- 리스팅: `/products.json?limit=250&page=N` → 전체 상품(title, handle, product_type, tags, variants,
  images, body_html). 129개(1페이지). Gift Card는 제외.
- ⚠ **무게: Shopify `variants[].grams`는 배송무게라 부정확.** 실제 무게는 상품페이지
  `<legend id="Weight-template--…"><span>Weight:</span> <span>33.4 oz / 946 g</span></legend>`에
  oz/g 병기로 서버렌더돼 있다 → g값 추출. 의류·소모품·일부 레거시 제품은 legend가 비어(0).
- 카테고리: product_type으로 분류(Backpacks→backpack, Shelters→tent/tarp/shelter, Foam Pads→mat,
  Trekking Poles→trekking_pole, Packing Cube/Duffel→pouch, Cooking→cookware_etc/cup/bottle 등).
  빈 product_type·accessories는 이름으로. ⚠ Apparel+Merch의 스티커/책은 clothing 아니라 etc.
  ⚠ **룰 검토에서 잡은 분류 함정**: (1) "**Backpacking** Trowel/Pocket Knife"의 "backpacking"이
  /pack/에 걸려 backpack으로 샘 → trowel→shovel·knife→cutlery를 /pack/보다 먼저, /pack/은 이름에
  단어경계(`\bpack\b`)로 태그 오염 방지. (2) headlamp/flashlight/lumen→lighting(Nitecore). (3)
  "Backpack Accessory" type이 catch-all이라 싯패드(foam/sleeping pad tag)→mat, 힙팩(blackbelt)→
  backpack, 팩커버(jacket)→backpack_cover, 수납백(sack/feedbag)→pouch, 소형팩(daypacks tag,
  Sidequest)→backpack로 세분류. (4) Little Towel→towel.
- 변형: 옵션축 Color→color, Size계열(Size/Pack Size/Hipbelt Size/…(Size))→size로 전개, 그 외 축
  (Hipbelt/Fabric/Style/Type/Section)은 접는다((color,size) dedup). 색상별 featured_image 매핑.

## ⚠ Cloudflare 레이트리밋 — 마커 재시도 필수

rapid 순차 요청(129개 상품페이지)은 Cloudflare 챌린지 페이지를 반환한다(길이는 크지만 실제 상품
콘텐츠 없음 → 초기 크롤 무게율 40%에 그침). `curlGet(url, marker)`가 실제 페이지에만 있는 문자열
(`Weight-template`, 모든 상품페이지에 값이 비어도 존재)을 확인해 **진짜 페이지 받을 때까지 백오프
재시도** → 무게율 83%로 회복. native fetch는 TLS 지문 막혀 curl 위임.

## ⚠ 한글화 — 미국 브랜드라 영문명뿐 (SKILL.md "한글화" 룰)

상품명·색상 100% 영문. KR 공식 스토어(gossamergear.co.kr, Cafe24)가 있으나 상품명이 마케팅 문구로
지저분해("…등산 데이팩 백패킹 경량 배낭 411g") verbatim 사용·코드 매칭이 곤란. → **KR 스토어의 공식
모델 표기(마리포사/고릴라/더투/더프리/그리트/스칼라/시마/피쿠/사이드퀘스트 등)를 사전 기반으로 일관 음역**
(`gossamer-gear-kr-apply.js`의 WORD/COLOR 사전, 음역 결과가 KR 스토어 표기와 일치). 서드파티 콜라보
브랜드(Toaks/Nitecore/Suunto/Cumulus/Kula/Evernew/Aerial)·소재/모델코드(DCF/TPU/DAC/PVT/UHMWPE/
FT3/LT5/GVP)·규격(인치/mm/버클/S·M·L·XL)은 그대로. 결과: nameKorean 100% 한글, 색상 전부 음역.
sizeKorean FLAG(하드웨어 규격·사이즈코드)은 번역 불가라 정당.

재실행: `node sites/gossamer-gear.js`(crawl.js 통해) → `node gossamer-gear-kr-apply.js`.

## ⚠ 카테고리 계약 (2026-08-09 앱 정리 반영)

앱(`lessismore-app`)이 세분 카테고리를 정리해(`crawl-pipeline-category-handoff.md`) 파이프라인도 맞췄다:
- **신설 키**: `cookware`(코펠·쿡웨어=조리 본체), `headlamp`(헤드랜턴), `furniture_etc`. `specs-schema.js`에 추가됨.
- **출력 금지**: `cooking`·`lantern`·`furniture`(그룹명과 겹쳐 폐기). 어댑터가 emit 안 함(validate가 ERROR로 잡음).
- **라벨 변경**: `clothing` 의류→일반.
- gossamer 재분류: 헤드램프(NU20)→`headlamp`, 팟류(Toaks Pot/Crotch Pot)→`cookware`. 손전등(TIKI)은 `lighting` 유지,
  베어 캐니스터(Bare Boxer)는 팟 아님이라 `cookware_etc` 유지. §3-1(헤드랜턴)/§3-3(조리) 규칙은 상품명 기준.
- 무게 보존 재분류기: `gossamer-gear-reclassify.js`(Cloudflare로 products.json 재페칭 불가 시 상품명만으로 영향 전환 적용).
- ⚠ push 시 `productImageUrl`(앱이 직접 쓰는 og:image) 보존 필수 — `push-firestore.js`는 update를 `{...data,...catalogFields}`로
  병합하고 catalogFields에 productImageUrl이 없어 기존값 보존됨(§5 충족). bags/used/useless도 동일 보존.

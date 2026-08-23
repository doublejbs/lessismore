# 더스턴기어 (durstongear.com)

- 사이트: https://durstongear.com — **Shopify 스토어**(캐나다 UL 텐트/백팩 브랜드, Dan Durston).
  리스팅/변형/이미지는 `products.json`, 무게·스펙은 상품페이지 서버렌더 `SPECIFICATIONS` 섹션에서.
- 크롤러: `sites/durston-gear.js`, 한글화: `durston-gear-kr-apply.js`
- 마지막 크롤: 2026-08, 33개 상품/41행(기프트카드 제외). 규칙: validate ERROR 0.

## ⚠ company 값 = "Durston Gear" (기존 수동입력과 통일)

**기존 DB에 사용자가 직접 입력한 더스턴 제품 27행(12모델)이 이미 있고 `company="Durston Gear"`(띄어쓰기·대문자)**
로 저장돼 있다. 크롤 관례(`durston-gear`)를 쓰면 앱에서 두 브랜드로 쪼개지므로 **어댑터 출력 company도
`"Durston Gear"`로 맞춘다**(companyKorean `더스턴기어`). groupId 접두는 슬러그라 `durston-gear_`로 둔다.

## ⚠ 신규 판별 — 기존 12모델은 push 제외

기존 수동입력 12모델: **X-Mid 1/2, X-Mid 1/2 Solid, X-Mid Pro 1/2/2+, X-Dome 1+/2, Kakwa 55/40, Wapta 30**
(전부 텐트 본체+백팩, 변형을 이름에 넣어 나눠놓음: Typical Setup 무게, 플로어/원단/인테리어별 개별 행).
크롤 시 이 12모델은 제외하고 **신규 20개만 push**: X-Dome Pro 1+, Iceline 트레킹폴, 그라운드시트 8,
스페어파츠 5, Z-Flick 텐트폴, DCF 리페어킷, 스티커, 리플렉티브 아이언와이어, 스타게이저킷.
> ⚠ 기존 문서는 company 조회 시 `"Durston Gear"`로 찾아야 한다(`durston-gear`로는 0건). 신규 판별은
> 이름 키워드가 아니라 **모델 대조**로. X-Dome의 "Solid"는 별도 제품이 아니라 이너 옵션(같은 상품페이지),
> X-Mid의 "Solid"는 별도 제품(자체 페이지 `x-mid-1-solid`)이니 구분.

## Shopify 구조 / 무게

- 리스팅: `/products.json?limit=250` (33개, 1페이지). 기프트카드 제외.
- ⚠ **무게: `variants[].grams`는 배송무게라 부정확.** 실제 무게는 상품페이지 `SPECIFICATIONS` feature-chart에
  라벨/값 쌍으로 렌더. 포맷이 상품군마다 다름:
  - 텐트: `Complete Tent  26.2 oz / 745 g` (oz / g)
  - 백팩: `Complete Pack (g)  Ultra 200X: 855 (S), 895 (M), 920g (L)` (원단·사이즈별) → 사이즈 이니셜 매칭
  - 폴: `Strapless Version 134 g (4.7 oz) per pole` (g (oz))
  - `fetchSpecText`는 `SPECIFICATIONS`부터 12000자 슬라이스(X-Dome은 MATERIALS가 6000자 밖이라 12000 필요).
  - 스페어파츠·스티커·리페어킷은 단일 무게 없음 → 0(정상).
- 스펙: 텐트=capacity(이름), flyMaterial(Canopy/Fly Fabric), innerMaterial(Floor Fabric), waterproofRating
  (`NNNNmm HH`), pitchType(X-Mid=트레킹폴/X-Dome=자립). 백팩=volume(이름), material(Main Fabric),
  hasHipBelt. 폴=material(Carbon), minLength(Collapsed)/maxLength.

## 변형 축

- Color→color, **Torso Size/Size→size**(Hipbelt Size 제외). 그 외(Fabric/Interior/Pole Set/Floor/Item/
  Tent Model/Quantity/Handle Straps/Include stakes?)는 접는다((color,size) dedup). 스페어파츠(Item×Tent Model
  조합 폭발)는 대표 1행으로 접음.

## 한글화

- 모델 코드(X-Mid/X-Dome/Z-Flick/Kakwa/Wapta/Iceline/DCF/DAC/ALUULA/Ultra/UltraGrid)는 한국에서도 영문
  통용 → 그대로. 일반어·색상·사이즈만 음역 + 브랜드 접두 "더스턴기어"(Durston 토큰은 접두가 대신 → 제거).
  예: `X-Mid 1`→더스턴기어 X-Mid 1, `Spare X-Dome Parts`→더스턴기어 스페어 X-Dome 파츠.

재실행: `node crawl.js durston-gear --no-open` → `node durston-gear-kr-apply.js` → (신규만 분리 후) push.

# 파타고니아 (patagonia.co.kr)

- 사이트: https://www.patagonia.co.kr — **커스텀 한국 이커머스**(forbiz enterprise 프레임워크, Naver Cloud 호스팅).
  KR 공식몰이라 상품명이 영문·한글 병기로 제공된다.
- 크롤러: `sites/patagonia.js`. 별도 한글화 스크립트 불필요(API가 `pname_kr` 공식 한글명을 준다).
- 마지막 크롤: 2026-09, 295개 상품/578행. company=`patagonia`, companyKorean=`파타고니아`. validate ERROR 0.

## 구조 — 상품 리스팅은 JS 렌더, API가 정답

- 카테고리 리스팅 `/shop/goodsList/{15자리코드}` 은 **HTML에 상품이 없다(JS 렌더)**.
- ⭐ **`POST /controller/product/getGoodslist`** 가 상품 JSON을 준다:
  `id`(goodsNo), `pname`(영문), `pname_kr`(한글), `pcode`(품번), 가격, `image_src`,
  `options.colors[]`(`tooltip`=색상명, 색상별 `image`/`thumb_images`), `options.sizes[]`,
  `basicCategoryName`/`basicCategoryPath`, `features`.
- ⚠ **CSRF 필수**: goodsList 페이지의 `<script>var forbizCsrf={...hash:"..."}` 해시를 추출해
  같은 쿠키 세션으로 POST 바디에 `ForbizCsrfTestName=<hash>` 로 넣는다. 안 넣으면 HTML(비JSON) 반환.
  curl 로 가능(`-c/-b` 쿠키 자 + `-H "X-Requested-With: XMLHttpRequest"`). 파라미터: `filterCid`(카테고리),
  `page`, `max`(=500이면 1페이지에 전부), `orderBy=regdateDesc`, `vlevel1=1`.
- ⚠ **무게·소재는 상세페이지** `/shop/goodsView/{id}` 서버렌더 `<h3>무게</h3><p>886g</p>` 에서.
  **Referer 헤더 필수**(`-e https://www.patagonia.co.kr/`, 봇차단 우회 — 이미지도 동일). 소재의
  "상품상세설명 참조" 는 플레이스홀더라 버린다. 무게 커버리지 99%(의류도 중량 표기!).

## 카테고리 — 쿼리한 대분류(도메인)가 결정적

상품별 `basicCategoryPath` 는 들쭉날쭉(키즈 데이팩이 Kids 경로로 뜨는 등)이라 신뢰 불가.
**`getGoodslist` 를 어느 대분류로 호출했는지**로 도메인을 고정한다:
- `001003000000000` Packs & Gear → 'packs' 도메인: 물병→bottle, 케어/리페어→etc, 러닝베스트→vest_pack,
  백팩/팩/데이팩→backpack, 나머지(큐브/MLC/더플/토트/슬링/힙)→pouch.
- `001002`/`001001`/`001004` Men's/Women's/Kids → 'apparel' 도메인: 장갑→gloves, 게이터→gaiter, 나머지→clothing.
- ⚠ **Packs & Gear 를 먼저** 크롤(ROOTS 순서)해 유니섹스 팩이 gear 로 확정되게 한다. 같은 상품이 다른 id로
  여러 대분류에 중복 등재되므로 **(groupId,color,size) 최종 dedup** 필수(먼저 온 gear 분류 유지).

## 변형 — 색상만 전개, 사이즈는 접는다

기존 의류 브랜드 관례(시에라디자인: 색상별 개별 행, size 미전개)에 맞춘다. 색상별로 이미지가 다르고
사이즈 변형은 이미지·스펙 동일이라 행만 폭발(전개 시 2288행 → 색상 단위 578행). 색상명은 `tooltip`(영문) →
`color`, `COLORMAP` 음역 → `colorKorean`. HTML 엔티티(`&apos;` 등)는 `decode()` 필수.

재실행: `node crawl.js patagonia --no-open` (전체 4개 대분류). 특정 대분류만: `PAT_ROOTS=001003000000000 node crawl.js patagonia`.

# OEL (oel.co.kr)

- 사이트: https://oel.co.kr — **아임웹(imweb)**. OEL = Outdoor Equipment Lab(아웃도어장비연구소), 2026-10 런칭한 국내 백패킹 브랜드.
- 크롤러: `sites/oel.js`. company `OEL | 오엘`.
- 마지막 크롤·push: 2026-11, **2개 상품 / 2행** push(inserted 2). validate ERROR·FLAG 0.
  - NYX Single Wall Tent / 닉스 싱글월 텐트 — tent, 815g
  - Titanium Shot Cup / 티타늄 소주잔 — cup, 27g, 40ml (사이트에서 품절 표시)

## 구조·함정

- 리스팅: `/shop` 페이지의 `shop_view/?idx=N` 링크. `/tent`·`/acc` 카테고리 페이지는 상품 카드를 서버렌더하지 않는다.
  idx 1~45를 직접 조회해 숨김 상품 없음을 확인(없는 idx는 `<title>페이지 없음`).
- 상품명은 영문 모델명만(`NYX`, `Titanium Shot cup`). **공식 한글명과 원단·폴·크기 사양은 상세 설명 "이미지" 안에만** 있어
  ocr.py로 확인한 값을 `KO_NAME` / `SPEC_EXTRA`에 고정. 새 상품이 생기면 같은 방식으로 두 맵에 추가(미등록이면 크롤 로그에 경고).
- 특징 줄 `· 815g 초경량`, `· 40mL`의 가운뎃점은 HTML 엔티티 `&middot;` — 디코드 안 하면 특징 줄을 하나도 못 잡는다(초기 버그).
- ⚠ 상세 정보 표 "무게" 칸은 배송무게일 수 있다(샷컵 실제 27g인데 "1kg") → **특징 줄 g 값 우선**.
- NYX 무게 815g = 사이트 대표값이자 사양표 "815g (Skin + Pole set)". 그라운드시트 95g·가이라인 33g·팩 110g·파우치는 미포함
  (옵션: 베스티블 134g, 이너 스크린 155g — 별도 상품 아님).
- 이름이 비슷한 기존 DB 제품과 혼동 주의: 스노우피크 `Nyx`(345g), 헬리녹스 `소주잔`은 다른 제품.

재실행: `node crawl.js oel --no-open` → `node validate.js out/oel-<ts>.json` → push(node@20 push.js).

## 2026-11-16 리프레시
- 신규 2개 push: Canopy 143 / 캐노피 143(초경량 3단 우산 143g, etc), Foldable Cup / 폴더블 컵(실리콘 200mL 77g).
- **"OEL FIELD MEET 2026"은 행사 참가권 → `NOT_PRODUCT` 제외.** 한글명·원단 사양은 상세 이미지 OCR → `KO_NAME`/`SPEC_EXTRA`.

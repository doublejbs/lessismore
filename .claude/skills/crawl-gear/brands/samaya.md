# 사마야 (samaya)

- **공식**: https://www.samaya-equipment.com  (Shopify, 프랑스 경량 산악)
- 크롤러: `samaya-global.py`(curl + 메타필드 파싱)
- 마지막 크롤: 2026-06, 67행

## ⚠️ 주의사항
1. 스펙은 제품 페이지 **metafield-rich_text_field 블록(프랑스어)** 에 서버렌더 → curl 로 파싱.
2. **이미지-색상 매핑 사후 검증 필수**: 컬렉션 featured_image/image_id 가 **틀린 색상 사진**을 가리키는 경우 다수
   (예: Bleu 변형인데 pink 파일명). 개별 product.json 의 `images[].variant_ids` ↔ `variants[].option1`(색상)
   직접 매칭해 교정. 파일명의 blue/pink/black 키워드로 1차 sanity check.
3. KR 판매 페이지 **옵션값**이 소재/그레이드(나일론 vs 다이니마)를 드러냄 → 형제 변형 구분에 활용.

## 룰 예외 (사용자 결정 2026-11-17)
- **텐트 모델명 "Samaya 2.0/2.5/3.5"는 브랜드명이지만 모델명 자체라 그대로 둔다**("사마야 3.5 다이니마"). 크롤 공통 룰 "제품명에
  브랜드명 금지"의 예외 — validate.js `BRAND_IS_MODEL`에 등록(브랜드명 바로 뒤에 모델 번호가 올 때만 허용).

## 한글명 (2026-11)
- 공식 한글명이 없어 `samaya-global.py`의 `ko_name()`(KO_WORD 사전)으로 음역. 기존 DB 표기에 맞춤: Assaut→어사우트,
  Vestibule→베스티블, Alpinist→알피니스트, Basecamp→베이스캠프. 배낭은 용량을 사이즈로("ULTRA35 / 35L"), tent_acc 스펙은 material만.

## 2026-11-16 리프레시 — 제외(Shopify 차단)
- Shopify가 이 컴퓨터의 curl 요청에 products.json·/collections를 HTTP 429 `local_rate_limited`로 20시간 넘게 막아 이번 리프레시에서 제외(사용자 결정 2026-11-18). 브라우저로는 열림 — **헤더 위장 등 우회 금지.**
- 다음 리프레시 때 다른 네트워크에서 돌리거나 시간을 두고 재시도. 스크립트는 2026-11-17에 현재 룰로 미리 고쳐 둠.

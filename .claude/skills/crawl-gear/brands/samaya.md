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

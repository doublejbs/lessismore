# 백컨트리 (backcountry, 국내 브랜드)

- **공식**: https://m.backcountry.co.kr (Cafe24 모바일 스킨, 국내 전용 브랜드 — 영문명 없음)
- 크롤러: `sites/backcountry.js`(리스팅+스펙이미지 수집), 무게 OCR `backcountry-weight-ocr.py`
- 마지막 크롤: 2026-07-15, 427개 (고유 groupId 219개)

## ⚠️ 주의사항

1. **`_source`(카테고리 URL) 하나에 실제 카테고리가 여러 개 섞여 있다.** `cate_no`가 사이트 자체 대분류라 내부 카테고리 키와 1:N 매핑됨:
   - `cate_no=24` → tent/tarp/shelter/mat 혼재
   - `cate_no=25` → tarp/shelter/tent_acc 혼재
   - `cate_no=26` → sleeping_bag/mat 혼재
   - `cate_no=28` → cookware_etc/table/chair/bottle/cup/cutlery/backpack 혼재
   - `cate_no=43` → etc/backpack/stove 혼재
   - `cate_no=44` → stove/lighting 혼재
   - `cate_no=46` → etc/backpack 혼재
   - **push 전에 반드시 `_source`를 `backcountry_<category>`로 재작성해 1:1로 맞출 것.** 그대로 push하면 `push.js`가 그룹 첫 항목 카테고리로 나머지를 전부 덮어씀 (2026-07-15 세션에서 실제로 겪음, push 직전 발견해 수정).
2. **리스팅 페이지네이션**: URL 파라미터 없이 "더보기" 버튼이 AJAX로 이어붙임(`$M.displayMore`) — puppeteer로 버튼을 `more_total_page` 횟수만큼 클릭해야 전체 목록이 나온다.
3. **스펙/무게가 텍스트가 아니라 상세 이미지 안**(`.ThumbImage`, 특히 `product/extra/big/` 경로). 크롤 단계는 `_specImages`만 모으고, 무게는 `backcountry-weight-ocr.py`(macOS Vision OCR)로 별도 채움. 구조화 spec 필드(재질/용량 등)는 **아직 미추출 상태** — 다음 작업으로 남음.
4. **무게 수집률 56%(241/427)에 그침.** 특히 `cookware_etc`(24%), `etc`(29%), `mat`(47%), `table`(40%), `stove`(48%)가 낮음 — 이미지 자체에 중량 표기가 없거나 OCR 매칭 실패로 추정. 재시도 여지 있음(다른 상세 이미지·타일 분할 재조정).
5. **색상 옵션이 "색상+번들타입" 복합값**으로 옴 (예: "쉐이드 타프쉘(올리브그린) 단품"). 괄호 안 색상어만 우선 추출(`KO_COLOR_EN` 사전) → 미매칭 시 로마자 음역 폴백.
6. **영문명이 아예 없어 로마자 음역(RR)으로 `name`을 생성.** 순수 발음전사라 외래어/브랜드명 인식이 없어 부자연스러운 표기가 섞임 (예: "쉘터 라이트 에디션" → "Swelteo Raiteu Edisyeon"). 검수 시 참고.

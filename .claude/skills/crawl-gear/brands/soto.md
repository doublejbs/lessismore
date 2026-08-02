# SOTO (소토)

- 사이트: https://sotooutdoors.com — WordPress + WooCommerce, 전부 서버렌더.
- 리스팅: `/product-category/<slug>/` (stoves, cookware, accessories, parts). `all-products`/
  `latest-and-popular`는 위 4개와 상품이 겹치는 재노출 카테고리라 제외.
- **ModSecurity가 `Accept` 헤더 없는 요청을 차단한다.** `User-Agent`만으로는 부족 —
  `Accept: text/html,application/xhtml+xml,...`를 반드시 같이 보낼 것. 헤더 없이 curl/fetch
  하면 "Not Acceptable!" mod_security 에러 페이지가 옴.
- 상세 페이지의 표준 WooCommerce "Additional information" 표(Weight(oz)/Dimensions(in))가
  깔끔한 텍스트라 OCR 불필요. oz→g(×28.3495), lb 단위도 방어적으로 처리.
- **무게 정규식은 정수부 없는 소수(".75 oz")를 허용해야 한다.** `(\d+(?:\.\d+)?)`처럼 앞자리
  숫자를 필수로 두면 "."을 건너뛰고 "75"만 읽어 100배 부풀려진다(SOTO O-Rings가 2126g으로
  나온 원인). `(\d+\.?\d*|\.\d+)`로 수정.
- **사이트 자체 데이터 불일치 발견**: "Titanium Bottle 200ml"(283g, "10 oz" 표기)가
  "Titanium Water Bottle 300ml"(198g, "7 oz" 표기)보다 무거움 — 작은 병이 더 무겁다는
  물리적으로 이상한 값이지만, 직접 페이지 확인 결과 **사이트 자체 표기 오류**로 확인됨
  (크롤러 버그 아님). 임의로 "고쳐서" 넣지 않고 사이트 표기 그대로 반영.
- 색상/사이즈 옵션이 있는 상품이 거의 없음 — 용량별로 아예 별도 상품 URL을 씀
  (Titanium Pot 750ml/1100ml 등). variation select 쓰는 상품은 확인 범위 내 없었음.
  → 모든 행 `color`/`colorKorean`/`size`/`sizeKorean` 빈 문자열.

## nameKorean 확보 — 한글 텍스트가 전혀 없는 사이트

이 브랜드는 사이트 어디에도 한글이 없어(미국/영어 전용) `nameKorean`을 사이트에서 그대로
가져올 방법이 없다. 시도 순서(사용자 지시에 따라 단계적으로 진행):

1. **국내 공식 수입사 검색** → SOTO는 국내 공식 수입사가 없거나 확인 못 함.
2. **국내 리셀러 오캠프(ocamp.co.kr, Cafe24) 카탈로그 대조** → 확실히 같은 제품으로 확인된
   6개만 verbatim 채택 (`KR_CONFIRMED` Map, 상품명 **전체 정확히 일치**할 때만 적용):
   - WindMaster Stove with 4Flex → 윈드마스터 스토브
   - Amicus Stove with/without Igniter → 아미쿠스 스토브
   - Fusion Trek Stove with advanced Micro Regulator Technology → 레귤레이터스토브 FUSION
   - TriTrail Stove → 레귤레이터 스토브 TRITRAIL
   - Navigator Camping Cookware Set → 네비게이터쿡시스템
   - Thermostack Cook Set (Combo 포함 2종) → 써모스택
3. **네이버 쇼핑 검색** → 나머지 ~38개는 검색 결과 자체가 안 잡힘(WebSearch의
   `site:shopping.naver.com` 필터가 결과를 안 줌 — 기존에도 네이버는 자동화 도구로 막혀있다고
   알려진 부분과 일치).
4. **음절 음역 폴백** (사용자 최종 지시) → 나머지 상품은 캠핑/쿡웨어 용어 사전
   (`WORD_KO`, black-diamond.js의 `EN_TO_KO_SOUND`/`syllabicKorean` 패턴 재사용) 기반
   단어 단위 번역 + 사전에 없는 단어는 음절 근사 표기.

### 음역 로직 세부 규칙 (`sites/soto.js`)
- **`KR_CONFIRMED`는 반드시 상품명 전체 정확히 일치할 때만 적용.** 처음엔 키워드 부분
  일치(`/windmaster/i`)로 짰다가 "Igniter Repair Kit for WindMaster Stove"처럼 그 스토브를
  "언급만" 하는 액세서리 상품까지 스토브 본품명으로 뭉개지는 버그가 나서 Map 기반 전체
  일치로 수정.
- 모델코드/숫자 섞인 토큰(`OD-1R`, `4Flex`, 사이즈 `750ml` 등)은 번역하지 않고 로마자 그대로.
- 대문자만으로 된 약어(`XT`, `SOTO`)도 음절로 쪼개면 못 알아보게 되므로 로마자 그대로
  (`isAcronym`).
- `ml`/`oz`/`kg` 등 국제 단위 표기는 그대로 둠(국내에서도 원어 그대로 통용).
- 카멜케이스 합성 고유명사(`ThermoLite`, `MicroRegulator`, `TriFlex`, hyphen 포함
  `Double-Wall`도 부수적으로)는 `splitCamel`로 구성 단어 단위로 쪼갠 뒤 사전 조회.
- 이 음역은 **최후 수단이며 완벽한 한글 표기가 아니다.** 추후 실제 정식 한글명을 확인하면
  `KR_CONFIRMED`에 정확한 상품명으로 추가해 교체할 것.

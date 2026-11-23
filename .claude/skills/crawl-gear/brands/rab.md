# Rab (rab)

- 크롤러: `sites/rab.js` — 신규 브랜드 어댑터의 **복사 템플릿**으로도 쓰임(`extractListing`/`fetchDetail` 표준 구조).
- 새 브랜드 만들 때 이 파일을 복사해 셀렉터/패턴만 교체.

## 2026-11 리프레시에서 배운 점

- **공식**: https://rab.equipment/kr (Magento). 기본 `defaultCategories`는 4개뿐 — 리프레시 땐
  `CATEGORY_MAP` 전체 카테고리로 크롤해야 신상품이 다 잡힌다. 카테고리끼리 상품이 겹쳐 `crawl()`이
  groupId|color|size 로 중복 제거한다.
- **영문명은 상세 URL 슬러그에서**(`englishNameFromUrl`): 사이트 이름이 한글뿐이라 예전엔 음역 이름이
  들어갔고, 그 탓에 DB 대조에서 전부 가짜 신규로 잡혔다. 슬러그의 rab- 접두·상품코드(-xxx-NN)를 떼고
  mens/womens → Men's/Women's, GTX/ND/AS 대문자, GORE-TEX 표기로 만든다.
- **사이즈 = Magento jsonConfig**: `"code":"colour_rab"`·`"size_rab"` 옵션의 products 배열 교집합이 그 색상의
  사이즈. 의류·장갑·게이터·etc·vest_pack 만 사이즈별 행으로 펼친다. one size/OS/원사이즈/free 는 사이즈 없음.
  여성 사이즈는 06~18(UK).
- 사이즈 분리 전에 사이즈 없이 push 된 옛 행이 많다 → `refresh-new.js` 규칙 5(같은 상품·색상이 DB에
  size 빈값이면 기존 취급)로 가짜 신규를 막는다. 옛 행 정리는 별도 작업.
- 색상 한글은 normalize-rules.js COLOR_PAIRS(템페스트·앤트러사이트·폴른·에보니·페블·피그 등)로 채운다.
- 결과: 신규 56상품 277행(2026-11-22).

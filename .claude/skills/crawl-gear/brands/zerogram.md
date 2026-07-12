# 제로그램 (zerogram.co.kr)

- 사이트: 자체 Vue SPA + JSON API 쇼핑몰 (Cafe24/Shopify 아님). 어댑터: `sites/zerogram.js`.
- 리스팅: `GET /api/category/<code>?limit=100&page=N`, 총개수는 `x-total-count` 응답 헤더.
  브라우저 없이 `fetch`만으로 충분 (봇차단 없음, User-Agent만 지정).
  - 리스팅 응답의 `colors[]`에 이미 `optionVal`(색상 영문명)·`repImg`(색상별 이미지)가 포함되어
    있어 상세 페이지 없이 색상 변형/이미지 확보 가능.
  - `FREE`는 색상이 아니라 "단일 옵션"(One Size 대응) 표기 → 빈 색상 처리.
- 색상별로 아예 **다른 itemCode**를 쓰는 상품도 많다(예: `ZU2BPX2604BLK/SGY/SKW`). 이런 경우
  리스팅에 동일 상품이 색상마다 별도 항목으로 나오고 각 colors[]는 길이 1. `itemName`은 색상 무관하게
  동일하므로 groupId는 itemCode가 아니라 (사이즈 제거한) itemName slug 기준으로 묶는다.
- 카테고리: `repDisplayCateCode`(상세페이지 필드)는 신뢰 불가 — null이 잦고, 선글라스/랜턴 같은
  것도 GEAR ACC catch-all(`001011`)로 찍힌다. **크롤한 leaf 카테고리 URL을 1차 신호로 쓰고**,
  체어/스틱(`001009`)·쿡웨어(`001010`)·가방(`001004001/002`)·타프쉘터(`001001006`)처럼 한 leaf에
  여러 내부 카테고리가 섞인 곳만 상품명 키워드로 refine했다 (어댑터 `LEAF_CATEGORIES` 참고).
  - `001011`은 다른 leaf와 대량 중복되는 catch-all이라 **가장 나중에** 크롤해 전역 dedup으로
    새 아이템(카라비너·온도계·코드슬링 등)만 순증하게 했다.
- SHOES(`005`)·모자/양말/일반ACC(`010`)는 33개 카테고리 스키마에 대응 키가 없어 크롤 제외.
- **무게/스펙은 텍스트가 아니라 전부 마케팅 "설명 이미지"** (`zenout01.cafe24.com/.../DESCRIPTION_*.jpg`) —
  코베아 케이스와 동일. `disclosureInfos`(법정고시)도 "상품상세 참조"만 있고 실제 값이 없다.
  - 이미지 URL은 `product.detailDescPc`/`detailDescMobile`가 아니라
    **`product.itemOptions[].itemOptionVals[].detailDescPc/detailDescMobile`** (색상 옵션 축)에
    들어있다. 최상위 `product.detailDescPc`는 옵션(색상)이 없는 단일 상품에서만 채워짐.
  - 어댑터는 `_specImages`만 수집하고 weight/specs는 0/{}로 둔다 — OCR 후처리 스크립트 필요
    (아직 미작성; 코베아의 `ocr.py`/`kovea-specs.py` 패턴을 참고해 새로 만들어야 함).
- 이미지 베이스: `https://image.zerogram.co.kr/` + (listing이 주는 상대경로 `files/products/...`).

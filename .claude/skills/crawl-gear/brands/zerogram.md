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
  - 어댑터는 `_specImages`만 수집하고 weight/specs는 0/{}로 둔다 — OCR 후처리는 `zerogram-specs.py`.
- 이미지 베이스: `https://image.zerogram.co.kr/` + (listing이 주는 상대경로 `files/products/...`).

## OCR 후처리 (`zerogram-specs.py`) — 코베아보다 훨씬 깨끗한 케이스

제로그램은 상세 이미지 마지막(또는 근처)에 **`_size.jpg`/`_SIZE.jpg`로 끝나는 전용 이미지**가
있고, 그 안에 고대비 산세리프 폰트의 "PRODUCT INFO" 라벨/값 2열 표가 있다. 이미지 크기도
1000×2500~4000px 정도라 (코베아의 20000px대 이미지와 달리) **타일링 없이 한 번에 OCR 가능**.
사용법: `python3 .claude/skills/crawl-gear/zerogram-specs.py <crawl-json> [out-json]`.

- **스펙 이미지 선택**: `_specImages` 중 URL이 `_size.jpg`(대소문자 무관)로 끝나는 것을 우선
  채택, 없으면 마지막 이미지로 폴백. 2023년 이전 구형 상품(`23ss/`, 일부 `_size` 없음)은 이
  전용 이미지 자체가 없어 무게/스펙 추출 불가 — 진짜 데이터 부재이지 버그 아님 (예: `23 엘찰텐
  제로본` 시리즈, 오래된 텐트 부속 몇 개, 일부 의류는 PRODUCT INFO 표에 무게 행 자체가 없음).
- **OCR 텍스트는 공백을 전부 제거하고(despace) "PRODUCTINFO" 마커부터 슬라이스**해 라벨/값을
  regex로 찾는다 (코베아의 despace 방식과 동일 원리, 라벨이 훨씬 일관적이라 매칭이 쉬움).
- **라벨과 값의 순서가 행마다 뒤집힌다 (중요 함정).** 대부분 "라벨→값" 순이지만, 아이콘이
  붙은 일부 행(플라이소재/내수압, 색상, 소재 등)은 Vision이 "값→라벨" 순으로 읽는다. 그래서
  `label_spans()`로 텍스트 내 모든 라벨 위치를 찾아두고, 라벨 뒤(forward) 텍스트가 비어있거나
  기대 타입과 안 맞으면(숫자를 기대하는데 forward에 숫자가 없거나, 문자열을 기대하는데 forward가
  숫자+단위뿐이면) 라벨 앞(backward, 이전 라벨 바로 뒤 텍스트)으로 폴백한다 (`value_for()`).
  한 방향만 취하므로 값이 라벨 양쪽에 걸쳐 있는 경우(예: 소재가 "메인:.../손잡이:..."로 앞뒤에
  나뉨) 한쪽만 잡히는 한계는 있음 — material류 문자열 필드라 치명적이지 않아 그대로 둠.
- **천단위 콤마가 마침표로 오독될 수 있다.** "1,500mm"가 아니라 "1.500mm"/"1,500mm"으로 읽혀
  `[\d,]+` 정규식으로 콤마 허용 후 제거해서 파싱. 무게는 한 술 더 떠 "1.206g"(=1,206g)처럼
  마침표 자체가 콤마 대신 천단위 구분자로 찍히는 경우가 있어, g 단위인데 소수점 뒤가 정확히
  3자리면 마침표를 제거해 천단위로 해석한다(`grams()`). 그래도 가끔 소수점을 아예 빼먹고
  "1.8kg"를 "18kg"로 읽는 경우가 있어(브룩스그라운드류 무게 오독 발견) **12kg 넘는 값은
  이 브랜드(초경량 백패킹) 특성상 오독으로 간주해 버리고 0으로 둔다.**
- 사이즈별(M/L, S/M 등) 값이 한 라벨에 같이 붙어 있으면(`size_code_of()`가 크롤 결과의
  `size` 필드에서 S/M/L 유추) 그 알파벳 뒤 숫자를 우선 채택, 실패하면 첫 숫자로 폴백.
- 카테고리별 라벨 매핑은 스크립트의 `WEIGHT_LABELS`/`extract_specs()`를 참고. 재크롤 후
  스펙을 다시 채우려면 `zerogram-specs.py`를 재실행하면 된다(크롤러 자체는 OCR 값을
  초기화하므로 재크롤 → OCR 순서를 지킬 것).

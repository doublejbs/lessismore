# 헬리녹스 (helinox.co.kr)

- 사이트: https://www.helinox.co.kr — **메이크샵(MakeShop), EUC-KR(CP949)**. 단일 브랜드몰이지만 상품 절반 이상이 콜라보·한정판.
- 크롤러: `sites/helinox.js` + 한↔영 사전 `sites/helinox-dict.js` + 무게 OCR 후처리 `helinox-weight-ocr.py`.
- 마지막 크롤: 2026-10/11. 리스팅 1,336개 → 상품 1,324개 / 1,590행(validate ERROR 0).

## 수집 범위·push 이력 (사용자 결정)

- **콜라보·한정판(Special/Limited, xcode 046) 779개 포함 전부 수집**(2026-10-19). 품절·비장비도 포함.
  상품이 아닌 페이지(캘린더 신청·인사이더즈·미니멀 캠핑 이벤트)만 `NOT_PRODUCT`로 제외.
- **2026-11 push: 무게 있는 상품만 938행(554개 상품)**. 무게 0인 652행(약 316개 상품, 대부분 의류·콜라보 잡화)은 **보류**.
  OCR로 찾은 무게(180개 상품) 포함, BAPE 렉타 3.5 + 타프폴 세트(uid 3553066)는 OCR 350g 오인식 의심이라 제외.
- DB 기존 Helinox 14행(사용자 입력분 — 이름 한글, 색상 한글, groupId 없음)과 **제품명+색상+사이즈가 같은 9행은 안 올림**
  (뉴미디엄과 같은 규칙): 체어제로 블랙·그레이·샌드, 체어제로 하이백 샌드·블랙, 체어제로 LT 사이언·멜론, 알파인돔 1.5P 블랙, 택티컬 테이블 S 블랙.
  기존 행은 색상이 한글이라 push 매칭(`groupId+color+size` 등)에 걸리지 않으므로, 대조 없이 올리면 중복이 생긴다.
- 무게 0 보류분을 나중에 올릴지(같은 기본 모델 무게로 채울지 포함)는 미정.

## API / 구조

- 리스팅: 카테고리 HTML은 빈 껍데기. XHR `GET /shop/product_list.action.html?action_mode=get_list&page=N&xcode=…&type=X|P|Y`
  (`X-Requested-With` 헤더) → JSON `{list:[{uid,brandcode,name}], is_page_end}`. `name`은 **CP949 URL 인코딩**.
  ⚠ "Shop All"(051)에 일부 상품이 빠져 있어 상위 카테고리 20개(`LIST_CATS`)를 **합집합**으로 모은다. brandcode 앞 3자리 = xcode.
- 상세: `/shop/shopdetail.html?branduid=<uid>`. ⚠ **초당 요청이 많으면 IP 차단 페이지(1KB 미만)** — 병렬 8개로 즉시 막혔다.
  순차 + 1.2초 간격, 차단 시 20초씩 늘려 재시도. 받은 HTML은 `out/helinox-cache/<uid>.html`(gitignore)에 캐시 → 재크롤은 캐시 우선.
  ⚠ **성인인증 페이지**(녹스프로 가스 캔 5종)는 로그인 없이는 상세를 못 본다 → `<uid>.html.adult` 표식 후 리스팅 이름·대표 이미지로만 행 생성.
- 제품명 `h2.prd-name`, 색상 `p.prd-subname`(**색상마다 상품 페이지가 따로**), 카테고리 경로 `nav.page_location`.
- 자체 옵션 `var optionJsonData = {basic:…}` — 옵션 이름이 제각각(SIze/사이즈/선택/옵션/버전/size). 값이 전부 색상 단어면 색상축,
  나머지는 사이즈축. "교환/환불 동의"·"각인문구"·"일산화탄소 경보기"는 변형 아님. 옵션별 이미지(`sto_image`)는 비어 있어 색상 옵션 상품은 이미지 1장 공유(validate FLAG 24건은 데이터 미존재).
- 이미지: 슬라이더 `//helinox.img13.kr/MS_product/<uid>/…` → 신규 CDN `www.cdn1.kr/dom/helinox.img13.kr/K-cdn-sub/MS_product/…` → 대표 `/shopimages/helinox/<brandcode>[3].jpg`.

## 이름 (helinox-dict.js)

- 정규 상품은 한글명만 → 사전으로 영문(체어원 → Chair One, 택티컬 → Tactical). 콜라보는 영문명(일부 한글) → 사전으로 한글. 사전에 없는 한글은 로마자 음역.
  치환은 긴 구절 우선 + 자리표시자(이중 치환 방지). ⚠ 한글엔 정규식 `\b`가 안 먹는다 → lookbehind/lookahead `(?<![가-힣])`.
- 판매 메모 제거: 시즌 접두(19SS·21FW), 발매 일시 괄호, `[HCC Only]`·`(HCC Seoul Only)`, "구매 페이지 X", "(단종)".
  `[2026 Ver.]`·`[Renewal]`은 모델 구분이라 `(2026 Ver.)`/`(2026 버전)`, `(Renewal)`/`(리뉴얼)`로 남긴다.
- 콜라보 파트너(`PARTNERS`, 약 100개)는 이름에서 떼어 끝에 `(BAPE Collab)` / `(베이프 콜라보)`. 여러 파트너는 `x`로 연결(Neighborhood x Claymore).
  구분자는 ` X `, ` x `, ` | `, ` ㅣ `, `&`, `by`, 붙은 `X헬리녹스`. company는 전부 Helinox(클레이모어 랜턴 등 파트너 제조품도 헬리녹스 콜라보 에디션으로 판매).
- 색상: `prd-subname` 우선, 콜라보는 이름 끝 ` / 색상`, `[RED]`, `(샐리)`, 꼬리 단어(1단어 → 2단어 순, "6 패널 캡 블랙"). "00. Mix" 번호 제거, 괄호 메모 제거.
  ⚠ 정규 상품의 구조적 슬래시(트레킹 폴 / Passport / TL125, 시트 워머 / 체어원)는 색상이 아니다 — `시트 워머 (체어원)`으로.
  색상 자리에 들어간 치수(포스터 50*70cm)는 사이즈로.
- 미해결: 스누피 콜라보 5개(`헬리녹스 x 스누피 / 슬리핑` 등)는 이름에 제품 종류가 없다(카테고리 경로상 체어) → 제품명 "체어", 디자인명은 색상으로 바꿔야 함(무게 0이라 이번 push 대상 아님).

## 무게

- 「스펙」 표 `구분 | (체결|결합|사용) 시 | 패킹 시` → **패킹 시 열 우선**(SKILL 우선순위 Packed Weight). 단일 열은 그 값.
- "무게(세트)" > "무게" > "무게(상판)". "1.26 kg / 1.42 kg (케이스 포함)", "2.81kg (패킹 시: 2.85kg)" → 케이스·패킹 값.
- 콜라보 구형 페이지 "무게 / 950 g / 케이스 포함 무게 / 1.140 g" → **마침표가 천 단위 구분**(1.140 g = 1,140g). 케이스 포함 우선.
  "케이스 포함 무게 (체어/락킹풋) 1.2 kg / 0.47kg" 세트 → 합산.
- 세트 합산은 페이지에 "세트 상품"·"구성:" 안내가 있을 때만(이너텐트 2P + 풋프린트 2P). ⚠ 락킹풋처럼 **열이 사이즈(One/(re)/Two/XL)인 표**는
  옵션 사이즈와 같은 열의 값을 쓴다 — 예전에 "(re)" 열을 보조 표기로 지워 열이 어긋나고 4개 합(1,990g)이 들어간 적 있음.
- 텍스트에 무게가 없는 콜라보 구형 페이지 479개 → `helinox-weight-ocr.py`로 상세 설명(`div.shopdetailItem` ~ `inner-cont`) 이미지 OCR
  (spec 이름 이미지 우선, 없으면 마지막 4장, 1500px 타일). 181개 채움. 나머지는 이미지에도 무게 없음(치수만) = 데이터 미존재.
  ⚠ `id="detailpage"`는 상세 설명이 아니라 페이지 끝 숨김 div — 처음에 이걸 기준으로 잡아 OCR 대상 0개였다.

## 카테고리 (`classify`, 영문명 키워드)

- 체어·벤치·스툴 → chair / 테이블 → table / 코트(야전침대) → furniture_etc(전용 키 없음) / 필드오피스 → pouch(수납박스)
- 체어·테이블 액세서리(컵홀더·시트워머·헤드레스트·볼핏·락킹풋·사이드 스토리지·퍼스널 쉐이드) → furniture_etc
- 돔·터널·에이치쉑·코트텐트 → tent, 렉타·W/V타프·필드 타프 → tarp, 로얄 박스 쉐이드·선쉐이드 → shelter,
  풋프린트·루프·이너텐트·플라이·타프폴·스트링·스토퍼·스테이크 → tent_acc
- 가스 캔·팟 매트 → cookware_etc(핸드오프 §3), 집게·커트러리 → cutlery, 랜턴류 → lighting(랜턴 액세서리는 lighting 아님)

재실행: `node crawl.js helinox --no-open`(캐시 사용) → `python3 helinox-weight-ocr.py out/helinox-<ts>.json <out>` →
`node validate.js` → 기존 Helinox 문서와 제품명+색상 대조 → push(node@20 push.js).

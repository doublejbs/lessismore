# MSR / 써머레스트 / 플래티퍼스 / 팩타월 (msr)

- **한국 공식 수입사**: http://www.msrgear.co.kr  (WooCommerce/Avada, MSR+써마레스트+플래티퍼스+팩타월 멀티브랜드)
- 크롤러: `msr.py`, 무게 OCR `msr-weight-ocr.py`, 색상 OCR `msr-color-ocr.py`, 미리보기 스텁 `sites/msr.js`
- 마지막 크롤: 2026-07, 271행(제품 ~237). 무게 234/271, 색상 32/271.
- ※ 예전 메모의 cascadedesigns.com(US Shopify) 어댑터는 폐기 — 이 KR 사이트로 크롤 완료.

## ⚠️ 주의사항

### 크롤 & 이름
1. **WooCommerce인데 사이트맵 없음** → 카테고리 페이지네이션(`/product-category/<cat>/page/N/`, 12개/페이지, ~6p).
   카테고리: stoves·tents·cookware·thermarest·water·snow-pole·packtowl. **page 범위 넉넉히**(range 1~14) — 5p에서
   끊으면 대형 카테고리 누락.
2. **한/영 이름 둘 다** 카드 `.product-title` 에 `<p>EN<br>KO</p>`. `<br>` 없이 붙은 경우도 처리:
   `EN한글`(첫 한글 분리)·`EN (한글)`(괄호)·`한글 EN`(역순). 전체 감싼 괄호·™® 앞 공백 정리(`_clean_nm`).
   상품 링크는 `/상품/<slug>/`(한글경로).
3. **이미지는 og:image**(WM은 없었지만 MSR은 있음). http 이지만 push 시 Storage 가 https 로 변환. **초기 버그: 이미지 전부 빈값이었음** → og:image 추가로 해결.

### 브랜드·스펙
4. **멀티브랜드 → 회사 분리**: 매트/베개/체어/침낭·써마레스트 모델명 → thermarest(써머레스트). 드로미더리/드롬라이트 →
   platypus. towel/팩타월 → packtowl. 그 외 → msr(엠에스알). **groupId 접두도 회사명**(thermarest_ 등).
5. **스펙은 텍스트**(attributes표 아님): `중량: 202g`/`무게 : 1.20kg`, 매트는 **사이즈별** `중량: R – 680g / RW – 880g`,
   `용량: 887ml`, `수용인원 : 1`. **`&#8211;`(en-dash) 반드시 unescape** — 안 하면 사이즈별 중량 파싱 실패.
6. **텐트 부속은 tent_acc**: 스테이크·코드·폴·지퍼풀·텐셔너·해머·풋프린트·기어쉐드. (Shield/Mesh House/Bivy/Body 는 정식 텐트/셸터라 tent 유지.) 머치(비니·티셔츠·연료캡) → clothing.

### 무게·색상 OCR (텍스트에 없을 때)
7. **무게 OCR**(`msr-weight-ocr.py`): 매트/베개/체어 등 무게가 이미지 스펙표에만 있음(`중량 R-620g / RW-820g`).
   **사이즈별이면 행을 사이즈별로 확장**(무게0 단일행 대체). 머치/소모품(스티커·비니·연료캡·이그나이터) 스킵.
8. **색상 OCR**(`msr-color-ocr.py`): 색상이 이미지에 `색상: 망고 (Mango)` 형태. **써마레스트/텐트 등 색상 있는
   카테고리만**(스토브·쿡웨어·커틀러리는 단색이라 스킵 — 안 그러면 느리고 낭비). **OCR이 콜론을 빠뜨리므로 영문병기형은
   콜론 선택적**. color=영문(`KO_COLOR_EN` 사전, 망고→Mango), colorKorean=한글. 스톱워드로 뒤 스펙과 안 섞이게.
   ⚠️ 크롤러 재실행하면 OCR 무게/색상 초기화 → 재크롤 후 무게 OCR·색상 텍스트·색상 OCR 다시.

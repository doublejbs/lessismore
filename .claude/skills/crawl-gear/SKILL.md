---
name: crawl-gear
description: 브랜드 공식 홈페이지 URL만 주면 카테고리를 자동 탐색해서 어댑터를 작성하고 크롤링한 뒤 HTML로 결과 미리보기까지 한 번에 처리. Firestore push는 사용자가 검토 후 별도 실행.
---

# crawl-gear

브랜드 공홈 URL을 받으면 Claude가:
1. 사이트 구조 자동 탐색 (`discover.js`)
2. 카테고리 매핑 + 어댑터 작성 (`sites/<brand>.js`)
3. 크롤 + HTML 미리보기 자동 실행 (`crawl.js`)
4. 사용자 검토 후 Firestore upsert (`push.js`)

## 자율 워크플로우 (사용자가 URL만 줄 때)

사용자가 "https://example.com 긁어와" 같이 요청하면 다음 순서로 진행:

### 1. 브랜드 키 결정
URL 도메인에서 브랜드 키 추출. 예: `https://www.mystery-ranch.com` → `mystery-ranch`. 사용자에게 한 줄로 확인.

### 2. 사이트 탐색
```bash
node .claude/skills/crawl-gear/discover.js <homepage-url>
```
- 네비게이션 메뉴 펼치기 (hover 이벤트 트리거)
- 같은 도메인 링크 수집
- 깊이/세그먼트별로 그룹핑
- 카테고리 후보 URL 목록 JSON 출력

이 출력에서:
- depth=2 이상 + 명확한 segment(예: `/backpacks/...`, `/sleeping-bags/...`, `/mens/jackets`) 가 카테고리 listing 후보
- segment text와 path를 보고 33개 내부 카테고리(`CATEGORY_KEYS`)로 매핑

매핑 모호한 경우 사용자에게 확인. 예: "이 브랜드의 '미드레이어'는 `clothing`으로 분류할까요?"

### 3. 어댑터 작성
`sites/<brand>.js` 신규 파일. `sites/rab.js`를 그대로 복사한 뒤 다음만 교체:
- `CATEGORY_MAP`: 발견된 URL 경로 패턴 → 내부 카테고리 키
- `companyKorean`: 브랜드 한글명 (모르면 사용자에게 확인)
- `extractListing()`: 사이트의 상품 카드 셀렉터 (DOM 탐색 한 번 더 필요)
- `fetchDetail()`: 사이트의 무게/스펙 행 패턴
- `defaultCategories`: 발견된 URL 중 대표 1~2개

상품 카드 셀렉터를 모를 때는 `discover.js`만으로는 부족. **Claude in Chrome 으로 한 카테고리 페이지를 열어 `javascript_tool` 로 DOM 확인**(아래 "사이트 확인은 Claude in Chrome 우선" 참고). 브라우저 MCP 가 안 되면 puppeteer 일회성 스크립트로 폴백:
```js
// 카드 컨테이너의 클래스/구조를 보고 셀렉터 결정
document.querySelectorAll('[class*="product"], [class*="card"], [class*="item"]')
```

### 3.5. 모든 카테고리 spec 추출 블록 작성 (중요)

신규 브랜드 어댑터 만들 때 **그 브랜드가 다루는 모든 카테고리의 spec 추출 블록을 fetchDetail에 함께 작성**.

순서:
1. `CATEGORY_MAP`에서 그 브랜드가 다루는 카테고리 키 목록 추출
2. 각 카테고리당 sample detail page 1개씩 **Claude in Chrome 으로 방문 → leaf-scan 으로 spec 행 덤프** (아래 "사이트 확인은 Claude in Chrome 우선")
3. 덤프 결과를 보고 `specs-schema.js`의 해당 카테고리 필드 중 추출 가능한 것 매핑
4. `if (cat === 'XXX') { ... }` 블록 추가

각 카테고리당 sample URL 1개씩 골라 상세 페이지 spec 위치를 비교한다. spec 이 탭/아코디언 안에 `display:none` 이어도 `textContent` leaf-scan 으로 읽히므로 클릭 불필요.

흔한 추출 패턴 (RAB 케이스):
- **volume (backpack/vest_pack/pouch)**: URL 슬러그의 `\d+L` 패턴
- **material**: "메인 원단" / "Main Fabric" / "Material" 로 시작하는 row
- **isWaterproof**: 정수압 헤드 row 존재 + 5000mm 이상, 또는 이름/URL에 "방수/Waterproof/GORE-TEX"
- **fillMaterial (sleeping_bag/clothing)**: "인슐레이션" row의 다운/synthetic 키워드
- **hasHood (clothing)**: 이름/URL에 "Hood(y/ed/ie)" / "후드"
- **capacity (tent)**: 이름의 "N Person" / "N-M인" / "Nin"
- **thickness/openSize (mat)**: "치수" row의 dimensions

각 사이트마다 라벨이 다르므로 sample 덤프 보고 정규식 작성. 빈 값은 그대로 `""` (null 금지).

### 4. 빠른 검증
```bash
node .claude/skills/crawl-gear/crawl.js <brand> --no-weight --no-open
```
- 리스팅 추출 잘 되는지 확인 (8개 이상 + 이름/이미지 정상)
- 실패 시 셀렉터 재조정, 재실행
- 성공하면 다음 단계

### 5. 풀 크롤
```bash
node .claude/skills/crawl-gear/crawl.js <brand>
```
- weight + 카테고리별 스펙 포함
- HTML 미리보기 자동 오픈 (macOS)

### 6. 사용자 검토
HTML 카드 그리드에서 확인:
- 누락된 스펙: 카드의 `NO SPECS` 또는 회색 dash로 표시
- 잘못된 카테고리: `_source` URL과 실제 상품을 보고 판단

---

## 어댑터 작성 실전 가이드 (팀 공유용)

### 작업 순서 권장 (시행착오 최소화)

1. **discover.js로 사이트 탐색** — 카테고리 후보 URL 파악 (Shopify면 `/collections.json` 으로 전체 컬렉션 확인)
2. **카드 셀렉터 한 번 확인** — Claude in Chrome 으로 한 카테고리 페이지 열어 leaf-scan (폴백: puppeteer 일회성 스크립트)
3. **detail 페이지 spec 위치 확인** — Claude in Chrome 으로 표/리스트/탭/lazy-load 여부 파악
4. **어댑터 초안 작성** — `sites/rab.js` 또는 `sites/msr.js` 복사 후 셀렉터/패턴만 교체
5. **`--no-weight --no-open` 으로 리스팅 검증** — 빠르게 (1분 안) 카드 추출 확인
6. **한 카테고리만 풀 크롤** — `--categories=<URL>` 로 spec 추출까지 검증
7. **HTML 미리보기 확인** — 데이터 누락/오류 파악
8. **수정 → 재실행** — 한 카테고리에서 잘 되면 다음 카테고리 추가
9. **풀 크롤** — 모든 카테고리 한 번에

### 사이트 유형별 흔한 패턴

| 사이트 유형 | 식별 단서 | 주요 셀렉터 |
|---|---|---|
| **Shopify** | `cdn.shopify.com` 자산, `.shopify-section`, `/collections/` | `.card-wrapper`/`.grid__item`, `.card__heading`. **리스팅·이미지·변형은 `products.json` API 우선.** 단 `grams`는 배송무게라 부정확 → 무게/스펙은 상세 페이지 스펙 테이블에서. 색상별 이미지는 `variant.featured_image.src` |
| **WooCommerce** | `/product-category/`, `wp-content` | `ul.products li.product`, `h3.product-title` |
| **Magento** | `/catalog/category/view/`, `magento` | `.product-item`, `.product-info` |
| **Algolia 검색** | `ais-*` 클래스 | `.ais-InfiniteHits-item`, `.ais-Hits-item` |
| **자체 SPA** | React/Vue 빌드 | 사이트별 다름 — 일회성 DOM 덤프 필요 |

### 자주 마주치는 문제 + 해결책

#### 1. 봇 차단 (403/406/ERR_BLOCKED)
- **증상**: puppeteer goto가 4xx 반환 또는 navigation timeout
- **해결**: User-Agent 설정 + native fetch fallback
```js
let resp;
try { resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }); } catch {}
if (!resp || resp.status() >= 400) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' } });
  await page.setContent(await r.text());
}
```

#### 2. SPA + 동적 로딩
- **증상**: `document.querySelectorAll('...').length === 0` (DOM 비어있음)
- **해결**: `waitForSelector` 또는 추가 sleep
```js
await page.waitForSelector('.product-card', { timeout: 15000 }).catch(() => {});
await new Promise(r => setTimeout(r, 2000));
```

#### 3. 페이지네이션
- **증상**: 카테고리 첫 페이지만 가져옴
- **해결**: pagination max page 추출 후 순회
```js
const max = await page.$$eval('.pagination a', els => {
  let m = 1;
  els.forEach(a => { const n = parseInt(a.textContent); if (n > m) m = n; });
  return m;
});
for (let n = 2; n <= max; n++) {
  await page.goto(`${url}?page=${n}`);
  items.push(...await extractListing(page));
}
```

#### 4. Lazy-load 탭 (Tech Specs 등)
- **증상**: 탭이 있는데 콘텐츠가 빈 panel
- **해결**: 탭 click 트리거 후 잠시 대기
```js
await page.evaluate(() => {
  document.querySelectorAll('.tab').forEach(t => {
    if (t.textContent.includes('Specs')) t.click();
  });
});
await new Promise(r => setTimeout(r, 2000));
```

#### 5. 잘못된 셀렉터 (네비 메뉴가 매치)
- **증상**: name 필드에 "Navigation" "Skip to content" 같은 값
- **해결**: 컨테이너 한정 + `closest('header, nav')` 제외
```js
const titleEl = document.querySelector('.product__title h1, .product-info h1') ??
  Array.from(document.querySelectorAll('h1')).find(h => !h.closest('header, nav'));
```

#### 6. 일부 제품만 spec 누락
- **원인**: 사이트가 모든 제품에 동일 데이터를 노출하지 않음 (신제품 vs 구형)
- **해결**: 어댑터로 해결 불가. 가능한 데이터만 추출하고 `""` 으로 두기

### 사이트 확인은 Claude in Chrome 우선 (권장)

카드 셀렉터·상세 페이지 spec 위치를 확인할 때는 **Claude in Chrome(브라우저 MCP)** 을 먼저 쓴다.
실제 브라우저라 SPA·lazy-load·봇차단이 puppeteer 일회성 스크립트보다 적게 걸리고, 대화 중 즉시 DOM을 탐색·반복할 수 있다.

흐름:
1. `list_connected_browsers` → `select_browser(deviceId)` → `tabs_context_mcp({createIfEmpty:true})` 로 탭 확보
2. `navigate(url, tabId)` 로 카테고리/상세 페이지 이동
3. `javascript_tool` 로 DOM 탐색 (아래 leaf-scan)

확장이 응답 안 하거나 `disconnected` 가 반복되면 → 사용자에게 Chrome 확장 사이드 패널의 연결/권한 승인 프롬프트 확인을 요청. 승인 후 `deviceId` 가 바뀌므로 `list_connected_browsers` 부터 다시.

#### leaf-scan: 라벨/값 텍스트 한 번에 수집

상품 카드나 spec 행은 대부분 자식이 거의 없는 leaf 요소다. 클래스명을 몰라도 텍스트로 긁어낸다:
```js
// javascript_tool 로 실행. 키워드는 카테고리에 맞게 교체.
(() => {
  const clean = s => s.replace(/\s+/g, ' ').trim();
  const kw = /(weight|volume|capacity|material|fabric|cm|mm|oz|gram|length|carbon|nylon)/i;
  const found = [];
  document.querySelectorAll('*').forEach(el => {
    if (el.children.length <= 2) {
      const t = clean(el.textContent);
      if (t && t.length < 110 && kw.test(t)) found.push(t);
    }
  });
  return JSON.stringify([...new Set(found)].slice(0, 40), null, 1);
})()
```

#### 중요 노하우 (이번 세션 검증)

- **탭/아코디언이 `display:none` 이어도 `textContent` 로 읽힌다.** Specs/Materials 탭을 클릭(`el.click()`)할 필요 없이 leaf-scan 으로 바로 추출됨. (`innerText` 는 숨김 요소를 건너뛰므로 `textContent` 를 쓸 것.)
- **`javascript_tool` 반환값에 쿼리스트링이 있으면 `[BLOCKED: Cookie/query string data]` 로 차단된다.** 이미지 src 등은 `s.split('?')[0]` 로 쿼리 제거 후 반환.
- **Shopify 사이트는 브라우저 없이 `products.json` 이 최고.** `/collections/<handle>/products.json?limit=250&page=N` → 이름·이미지·`body_html`·variants(무게 `grams`!)를 구조화 JSON 으로 제공. 전체 컬렉션 목록은 `/collections.json?limit=250`. 브라우저는 `products.json` 에 없는 spec(용량·소재·길이 등 metafield 탭) 위치 확인용으로만 쓴다.
- 구조화 spec 이 metafield 탭에만 있고 `body_html` 은 마케팅 문구뿐인 경우가 많다 → 리스팅·무게는 `products.json`, spec 은 상세 DOM leaf-scan 의 하이브리드가 안정적.

### 디버깅 일회성 스크립트 템플릿 (Claude in Chrome 불가 시 폴백)

브라우저 MCP 를 못 쓰는 환경이면 puppeteer 일회성 스크립트:
```js
node -e "
import('puppeteer').then(async ({default: p}) => {
  const b = await p.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await b.newPage();
  await page.setUserAgent('Mozilla/5.0 Chrome/120.0.0.0');
  await page.goto('<URL>', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  const r = await page.evaluate(() => {
    // 여기에 탐색 코드 (leaf-scan 등)
    return document.querySelector('...').outerHTML.slice(0, 2000);
  });
  console.log(r);
  await b.close();
});
"
```

### 출력 검증 체크리스트

크롤 후 JSON 또는 HTML에서 확인:
- [ ] `name` 필드가 실제 상품명인가? (네비/메뉴 텍스트 아님)
- [ ] `imageUrl` HTTPS 절대 URL인가?
- [ ] `weight` 그램 숫자인가? (kg/lb/oz 변환됨)
- [ ] `groupId` 형식이 `<brand>_<slug>` 인가?
- [ ] 같은 제품의 다른 색상이 같은 `groupId`인가?
- [ ] spec 필드가 schema 키와 일치하는가? (오타 없음)
- [ ] empty 값이 `""` (null/undefined 아님)?

### 어댑터 코드 컨벤션

- 사이트 특이사항은 파일 상단 주석에 명시 (WAF, lazy-load, 페이지네이션 방식 등)
- 라벨/regex는 사이트별로 다르므로 하드코딩 OK
- 카테고리별 if 블록은 `if (cat === 'tent') { ... }` 형식 통일
- 에러는 throw 대신 빈 결과 반환 (다른 카테고리 진행되도록)
- console.log 진행 상황: `[brand]   detail X/N` 등으로 추적
- 누락 데이터가 많으면 어댑터 수정 → 재실행

### 7. Firestore push (사용자 확인 후 별도 명령)
```bash
ADMIN_UID=<uid> node .claude/skills/crawl-gear/push.js <json-path>
```
크롤은 자동, push는 사용자가 검토 후 명시적으로 실행.

## 데이터 스키마

### 공통 필드

| 필드 | 설명 |
|---|---|
| `id` | UUID. 문서 ID와 동일 |
| `groupId` | 변형 묶음 키 (예: `rab_mythic-ultra-down-sleeping-bag-6c`) |
| `category` | 영문 키 33개 중 하나 |
| `company` / `companyKorean` | 영문 브랜드 키 / 한글 브랜드명 |
| `name` / `nameKorean` | 영문 / 한글 제품명 |
| `color` / `colorKorean` | 영문 / 한글 색상 |
| `size` / `sizeKorean` | 영문 / 한글 사이즈 |
| `weight` | 그램 단위 숫자 |
| `imageUrl` | https 절대 URL |
| `specs` | 카테고리별 스펙 객체 |
| `isCustom`, `useless`, `used`, `bags`, `createDate` | 유저 데이터 — push 시 보존 |

알 수 없으면 빈 문자열 `""` (null 금지).

### 33개 카테고리 영문 키

```
backpack          vest_pack        backpack_cover
tent              tarp             shelter         tent_acc
sleeping_bag      mat              pillow
cup               bowl             cutlery
stove             torch            bottle           cookware_etc
chair             table
clothing          sunglasses       gaiter           gloves
lighting          food             towel            pouch
hand_warmer       shovel           hammer           microspikes      trekking_pole
etc
```

한글 라벨: `CATEGORY_LABELS` (specs-schema.js).

### 카테고리별 스펙

`specs-schema.js`에 정의. 어댑터는 추출 가능한 필드만 채움. 모두 옵션.

| 카테고리 | 필드 |
|---|---|
| sleeping_bag | shape, fillMaterial, fillWeight, fillPower, comfortTemp, limitTemp, zipperSide |
| tent / tarp / shelter | capacity, wallStructure, shape, innerMaterial, flyMaterial, poleMaterial, waterproofRating, pitchType, vestibuleArea |
| mat | type, shape, material, rValue, thickness, openSize |
| backpack / vest_pack | volume, material, frameType, backSystem, hasHipBelt, hasShoulderBottlePocket, hasRainCover, gender |
| stove / torch | material, fuelType, output, ignition, hasWindscreen |
| cup / bowl / cookware_etc | material, capacity, isSet |
| cutlery | material, isSet |
| bottle | material, capacity, isInsulated, mouthType |
| clothing | type, material, isWaterproof, fillMaterial, hasHood |
| sunglasses | lensMaterial, uvProtection, isPolarized |
| gloves | type, material, isWaterproof |
| gaiter | height, material, isWaterproof |
| chair | material, frameMaterial, maxLoad, packedSize |
| table | topMaterial, frameMaterial, maxLoad, packedSize, isHeightAdjustable |
| lighting | type, maxBrightness, batteryType, waterproofRating, maxRuntime, hasRedMode |
| trekking_pole | material, foldType, lockType, minLength, maxLength |
| pouch / backpack_cover | material, isWaterproof, capacity |
| tent_acc / pillow / food / towel / hand_warmer / shovel / hammer / microspikes / etc | material, size |

## 변형 처리 (Sea to Summit 세션에서 확립한 룰)

같은 제품의 색상/사이즈/온도가 다르면 **별도 행**, 같은 `groupId`로 묶임.

**핵심 룰:**
- **옵션(사이즈·색상·온도)별로 모두 개별 제품으로 수집.** Shopify면 `products.json`의 `variants` 전체를 순회해 한 변형당 한 행. (예: 4사이즈×7색상 = 28행)
- **사이즈를 영문 `name` 끝에 부착** (예: `Ascent Down Sleeping Bag Long / 15°F`). 사이즈+온도 등 비색상 옵션을 ` / `로 이어붙임.
- **`One Size` / `Default Title` 은 사이즈 없음으로 처리** — `size`/`sizeKorean` 빈값, 이름에도 안 붙임.
- **색상별 이미지를 각각 수집.** Shopify 컬렉션 `products.json`은 variant에 `image_id`가 없고 **`variant.featured_image.src`** 에 색상별 사진을 담는다 (개별 `product.json`은 `image_id` 사용). featured_image 우선.

**무게·스펙은 변형 인덱스가 아니라 "스펙 컬럼 헤더"로 매핑한다 (중요):**
- 스펙 테이블 컬럼 수 < 변형 수인 경우가 흔하다 (스펙은 사이즈/온도별, 색상엔 무관). 변형 인덱스(vi)로 컬럼을 읽으면 색상 변형이 전부 어긋나 0/오값이 된다.
- 각 변형의 **비색상 옵션값(사이즈·온도)** 을 스펙 테이블 **헤더 라벨** 과 매칭해 컬럼을 찾고, 그 컬럼에서 무게/온도/충전재를 읽는다.

**무게 추출 룰:**
- 우선순위: `Packed Weight` → `Weight` → `Set Weight` (쿡세트류는 Set Weight만 있음).
- **Shopify `variants[].grams` 는 배송무게라 부정확** — 스펙 테이블 값을 쓴다.
- 단위 토글(metric/imperial)이 `<span class="met">`/`<span class="imp">`로 동시 렌더되면 **met(미터법) 값만** 추출 (버튼 클릭 불필요).
- **반올림 금지** — 사이트 표기 그대로 (예: `527.1g`).

## 한글화 (nameKorean / sizeKorean / colorKorean)

영문 카탈로그를 한글명까지 채우는 워크플로우 (Sea to Summit 세션에서 확립). 참고 구현: `kr-reference.js`, `kr-match.js`, `kr-apply.js`.

**원칙: 한국 공식 수입사/유통사 사이트에서 동일 제품을 찾으면 그 공식 한글명을 그대로(verbatim) 쓰고, 못 찾으면 음역으로 생성.**

### 1. KR 레퍼런스 수집 (`kr-reference.js` 패턴)
- 브랜드의 **한국 공식 수입사 사이트**를 찾는다 (예: 씨투써밋 → 니오 seatosummit.co.kr). 봇차단(403)은 User-Agent 헤더로 우회.
- 카테고리 리스트 → `(제품코드, 한글명)`, 상세 페이지 → **영문 모델명** 추출 → `{en, ko}` 레퍼런스 구축. (KR 사이트는 보통 한글명만 노출하고 상세에 영문명이 있어, 영문명이 매칭 키가 됨.)

### 2. 변형 단위 매칭 (핵심 룰)
**동일 제품 판정은 모델 + 온도 + 사이즈 + 색상 + 타입이 "모두" 일치해야 한다.** 하나라도 다르면 다른 제품 → 생성으로 폴백. (라인 단위로 대충 매칭하면 US 15°F 변형에 KR -10도 이름이 박히는 오류 발생.)
- 가드 예시: 침낭 `limitTemp(℃)` ↔ KR "N도", 매트 자충(SI)/에어 타입, 침낭 다운/신세틱, 텐트 TR코드, 사이즈/용량 충돌.
- 매칭됨 → **KR 공식명 verbatim**. 공식명에 사이즈가 없으면 끝에 `sizeKorean` 부착.
- 미매칭 → **음역 생성** (모델라인 음역 + 한글 카테고리어) + `sizeKorean`.

### 3. sizeKorean 규칙
- 단어형 음역: Regular→레귤러, Long→롱, Small→스몰, Large→라지, S/M/L/XL→스몰/미디엄/라지/엑스라지, Wide→와이드, Rectangular→렉탱귤러.
- **온도 °F→℃ 변환** (예: 15°F→-9℃). 용량(5L)·텐트코드(TR2)·인치(10in)는 그대로. One Size/Default→빈값.
- 매칭 시엔 KR 표기(약어 LG/RG/사각 등)와 음역을 같은 사이즈로 취급(canonical)해 중복 부착 방지.

### 4. colorKorean 규칙
- KR 사이트 표기 스타일로 음역 (Beluga→벨루가, Tarragon→타라곤, Spicy Orange→스파이시 오렌지). 멀티컬러는 `/`로 분리해 각각 변환.

## 사전 준비

### 다른 컴퓨터에서 처음 쓸 때 (의존성)

스킬 파일·데이터는 레포에 포함돼 git clone 으로 동기화된다. 추가로 필요한 것:

1. **Node 의존성** — 레포 루트에서 `npm install` (이미 `package.json` 에 `puppeteer`, `firebase-admin` 선언됨). 워크트리면 글로벌 규칙대로 메인 클론 `node_modules` 를 심링크.
   - **Node 버전 주의:** 크롤(`crawl.js`)은 최신 Node 무방하지만, **Firestore push(firebase-admin)는 Node 20 LTS 로 실행**해야 한다. Node 22+(특히 26)에선 firebase-admin 의 전이 의존성이 제거된 `SlowBuffer` 를 참조해 크래시한다. 푸시만 `node@20` 바이너리로: `/opt/homebrew/opt/node@20/bin/node server.js`.
2. **Pillow (선택)** — `nemo-specs.py` / `nemo-findtable.py`(한국 고시 이미지 크롭) 사용 시에만. `python3 -m pip install Pillow`. 글로벌 사이트 스크래퍼(`*-global.py`)는 표준 라이브러리만 쓰므로 불필요.
3. **serviceAccountKey.json** — Firestore push 시점에만 (아래). 머신마다 수동 추가.

`.config.local.json`(adminUid) 은 gitignore 라 동기화 안 되지만, serviceAccountKey 만 있으면 첫 실행 시 Firestore 에서 자동 감지·저장된다.

### Service Account Key (push 시점에만 필요)

Firebase Console → 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성" → `.claude/skills/crawl-gear/serviceAccountKey.json`.
`.gitignore` 포함. 절대 커밋 금지.

### ADMIN_UID (push 시점에만 필요)

`src/manage/ManageView.tsx`의 `ALLOWED_UIDS` 배열 참고.

## Upsert 매치 규칙

순서대로 매치 시도:
1. `groupId + color + size` (정확한 변형 매치)
2. `nameKorean + company + color` (신규 스키마)
3. `name + company` (legacy 매치 — 기존 데이터의 `name` 필드가 한글이었으므로 nameKorean 값으로 조회)

매치되면 UUID 유지하고 카탈로그 필드만 덮어쓰기. 유저 데이터(`useless/used/bags/isCustom/createDate`) 보존. 매치 안 되면 새 UUID로 insert.

## 트러블슈팅

- `discover.js`가 너무 많은 링크 반환 → JSON에서 `bySegment` 보고 카테고리 segment 추리기
- 리스팅 추출 0개 → SPA 로딩 대기시간 부족. 어댑터에서 `waitForSelector` 또는 sleep 늘리기
- weight=0 다수 → 상세 페이지 무게 정규식이 사이트와 안 맞음. `fetchDetail`의 regex 수정
- specs 비어있음 → 해당 카테고리 블록을 어댑터 `fetchDetail`에 추가 필요
- Firestore 권한 오류 → serviceAccountKey.json 누락
- **무게/온도가 색상 변형에서만 0/오값** → 변형 인덱스로 스펙 컬럼을 읽고 있는 것. 헤더 라벨(사이즈/온도) 매칭으로 컬럼을 찾아야 함 (위 "변형 처리" 참고)
- **무게가 정수로 깎임** → `parseWeight`에서 `Math.round` 제거, met span 값 그대로
- **HTML "저장" 시 서버 연결 실패** → 푸시 서버 미실행. `node@20 server.js`로 포트 3847 기동 (`--from-json`은 서버 안 띄움). `lsof -ti:3847`로 확인
- **firebase-admin `SlowBuffer` 크래시** → Node 버전 너무 최신. `node@20`으로 푸시
- **네이버 스마트스토어 등 강차단 쇼핑몰** → 서버 fetch는 429, Claude in Chrome도 쇼핑몰 안전제한으로 차단되어 현재 도구로 크롤 불가. 공식 브랜드 사이트를 우선 타깃으로

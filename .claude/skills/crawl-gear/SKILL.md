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

## 이미 크롤한 브랜드를 다시 할 때 (리프레시 / 신규 추가)

**크롤 시작 전 `brands/<brand>.md` 메모를 반드시 먼저 읽는다.** 각 브랜드의 사이트 링크·플랫폼·
지난 주의사항(무게 출처, 카테고리 함정, OCR 여부 등)이 적혀 있어 같은 실수를 반복하지 않는다.
크롤 후 그 브랜드에서 새로 배운 주의점이 있으면 메모를 갱신한다.

**신규 판별은 Firestore 가 기준선.** 별도 목록 파일을 관리하지 말고, 재크롤 결과를 Firestore 의
기존 문서(`company` 로 조회)와 대조해 없던 것만 신규로 본다. upsert 는 멱등이라 기존은 갱신·신규는
insert 되고 유저 데이터는 보존된다(이미지 재업로드 비용 때문에 신규만 push 하는 게 효율적).

리프레시 절차: main 에서 `crawl/refresh-<날짜>` 브랜치 → 브랜드별 메모 읽고 재크롤 → Firestore 대조로
신규 추출 → 신규만 push → "브랜드별 +N개" 리포트 → 메모 갱신 → 한 PR 로 머지.
> **크롤러 코드와 `brands/` 메모는 반드시 커밋**해 둔다(미커밋 파일은 삭제되어 재현·주의가 불가능해짐).

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
| **SPA + POST 리스팅 API** (몽벨 케이스) | 카테고리 링크가 전부 같은 경로(예: `/products/list`)에 `?c=N` 쿼리로만 구분, 리스팅이 빈 DOM | fetch 인터셉트(`window.fetch` 래핑 후 더보기 클릭)로 XHR 찾기 → POST 엔드포인트(예: `/products/more?c=N` body `{o:offset,l:limit}`)가 **색상·사이즈·무게 포함 구조화 JSON** 반환. 브라우저 same-origin fetch에 `meta[name=csrf-token]` 얹어 호출 |
| **한국형 PHP 쇼핑몰** (youngcart/cafe24, KR 한글명 레퍼런스용) | `list.php?ca_id=`, `item.php?it_id=`, gnuboard 흔적 | 서버렌더라 node fetch 직접 가능(봇차단 적음), 페이지네이션 `&page=N`. `<div class="model">코드</div><div class="name">한글명</div>` 패턴 |
| **Cafe24 쇼핑몰 카테고리 페이지** (예: bozeman.kr, `/category/<name>/<번호>/`, `xans-product` 클래스) | URL에 `/category/`, HTML에 `xans-element- xans-product` | 서버렌더 → curl + User-Agent로 직접 가능. 상품 카드: `<li id="anchorBoxId_<번호>">` 안에 `strong.name > a > span` (상품명, `[브랜드명]` 접두어 포함), `img alt`에도 동일 텍스트, `ec-data-price` 속성에 가격. 페이지네이션은 `?page=N` (마지막 페이지는 `<a>` 링크가 사라짐). 특정 브랜드 전용 카테고리는 보통 그 브랜드 상품만 있지만 "브랜드명만 크롤링" 요청 시 상품명에 브랜드명 포함 여부로 한 번 더 필터링. |
| **Cafe24 + 스펙이 이미지** (코베아 케이스) | `cafe24`, `/product/<slug>/<no>/`, 상세 스펙이 텍스트 아닌 **긴 이미지**(koveaimage CDN / `/web/upload/NNEditor`) | 리스팅·이름(og:title)·옵션은 fetch, **스펙·무게·온도·색상은 macOS Vision OCR**(타일 분할). 전체 제품은 `/sitemap.xml`. 아래 "스펙이 이미지 안에 있을 때" 참고 |

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
- **변형별 이미지를 각각 수집(색상 변형뿐 아니라 사이즈 변형도).** Shopify 컬렉션 `products.json`은 variant에 `image_id`가 없고 **`variant.featured_image.src`** 에 색상별 사진을 담는다 (개별 `product.json`은 `image_id` 사용). 단 컬렉션에 featured_image조차 없을 수 있다(NEMO) → 개별 `/products/<slug>.json`의 **`variant.image_id` → `images[].id`** 로 매핑한다. 한 제품에 이미지 한 장 일괄 금지. (자세히는 아래 "니모 세션" #2.)
- **이미지-색상 매핑은 사후 검증 필수 (SAMAYA 세션에서 발견).** featured_image/image_id가 잘못된 색상 사진을 가리키는 경우가 다수 있다 (예: Bleu 변형인데 pink 파일명 이미지). 개별 `product.json`을 받아 `images[].variant_ids` ↔ `variants[].option1`(색상)을 직접 매칭해 `imageUrl`을 재검증·교정한다. 파일명에 `blue/pink/black` 등 색상 키워드가 있으면 1차 sanity check로 활용.

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
- **KR 판매 페이지의 "옵션" 선택지가 소재/그레이드 변형을 드러낼 수 있다 (SAMAYA 세션).** 제목만으로는 나일론/다이니마 구분이 안 되지만 `<select>` 옵션값(예: "베스티뷸 다이니마")이 실제로는 Dyneema 버전임을 알려줌 → 그 카탈로그 항목의 `nameKorean`에 옵션명의 소재어(다이니마/나일론)를 반영해 나란히 있는 형제 변형(나일론 버전)과 구분되게 한다.

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
2. **Pillow (선택)** — `nemo-specs.py` / `nemo-findtable.py`(한국 고시 이미지 크롭), 코베아 OCR 스크립트의 이미지 타일링에 사용. `python3 -m pip install Pillow`. 글로벌 사이트 스크래퍼(`*-global.py`)는 표준 라이브러리만 쓰므로 불필요.
3. **pyobjc (선택)** — 스펙이 이미지 안에 있는 사이트(코베아 등) OCR 시에만. `python3 -m pip install pyobjc-framework-Vision pyobjc-framework-Quartz`. macOS Vision 한국어 OCR(`ocr.py`, `kovea-*.py`)에 필요. (swift 직접 컴파일은 베타 SDK 충돌로 실패할 수 있음 → pyobjc 사용)
4. **serviceAccountKey.json** — Firestore push 시점에만 (아래). 머신마다 수동 추가.

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
- HTML 미리보기만 다시 만들려면 크롤 없이 `node crawl.js <brand> --from-json=<json> --no-open` (서버 spawn이 죽어도 HTML/JSON은 이미 생성됨)

### 몽벨 세션에서 확립한 룰 (일반화)

- **리스팅 JSON의 정렬/배송용 무게 필드를 믿지 말 것.** Shopify `grams`, 몽벨 `sorting_weight` 같은 필드는 실제 스펙 무게와 다를 수 있다(예: Stellaridge Tent 3 Rain Fly — `sorting_weight` 420 vs 스펙 Weight 470g). **무게는 상세 스펙 테이블의 표시값**(Weight → Total/Packed Weight → Set Weight 우선순위)에서 파싱하고, 없을 때만 리스팅 필드로 폴백. kg→g 변환만 하고 측정값 반올림은 금지.
- **스펙 셀에 규제 고지문이 구분자 없이 붙는다.** 예: 소재 셀 끝에 `...(urethane coating)This product contains PFAS and cannot be shipped to some jurisdictions.` → 마커("This product contains PFAS")부터 문자열 끝까지 제거. **주의**: `value.slice(0, N)`로 먼저 잘리면 고지문이 중간에 끊겨(`...cannot be shipped to`) 전체-문장 정규식이 안 맞는다 → 슬라이스 **전에** 제거하거나 `/마커[\s\S]*$/` 로 마커 이후 전체 제거. `(PFAS-free ...)` 같은 정상 소재 표기는 보존.
- **변형이 색상→사이즈 2단 중첩**인 리스팅 JSON이 흔하다(`colors{ CODE: { sizes{ ... } } }`). 두 단계를 모두 순회해 (색상×사이즈) 행 생성. 색상별 이미지 코드가 이미지 URL에 박히는 경우가 많다(`{productCode}_{colorCode}.webp`).

### 한글화 — KR 레퍼런스 사이트에 영문/코드가 전혀 없을 때 (몽벨 변형)

S2S처럼 KR 수입사 상세에 **영문 모델명**이 있으면 영문-토큰 매칭이 쉽지만, montbell.co.kr 처럼 **한글명만 있고 글로벌 코드·영문이 전무**한 경우가 있다. 이때 매칭 브리지:

1. **KR 레퍼런스 수집** (`kr-reference-montbell.js`): 한국형 PHP 몰 전 카테고리 순회 → `(it_id, 한글명)`. 한글명은 보통 `모델 + 남/여 + 말미 영문색상` 형태.
2. **US 영문명 → 음역** (EN→KO 사전): 구조어(Down→다운, Jacket→자켓 …)+모델어(Stellaridge→스텔라릿지 …). 사전은 KR 레퍼런스의 실제 한글 표기를 정답으로 삼아 구축.
3. **매칭** (`kr-apply-montbell.js`): 음역결과 ↔ KR 한글명을 **숫자집합 완전일치 + 성별 일치 + bigram Dice ≥ 0.85(근접 길이 우선)** 로 매칭. 매칭되면 KR 공식명 verbatim, 아니면 음역 폴백.
   - **반드시 가드**: ① 성별(Men's↔남 / Women's↔여) — 없으면 여성 제품에 남성 이름이 박힘. ② KR 시장 프리픽스(`US`/`PS`/`WIC`/`SIC`)·말미 영문색상 제거. ③ 숫자집합은 *정확히* 일치(부분집합 X) — `30L`↔`30L 2`(버전), `20L`↔`30L` 오매칭 방지.
   - 팩 카테고리는 KR 관례상 용량에 `L` 부착(차차 팩 30 → 30L)해 패밀리 내 표기 통일.

### 니모(NEMO) 세션에서 확립한 룰 (일반화 — 영문 글로벌 + Shopify)

참고 구현: `nemo-global.py`(영문 스펙 빌더), `nemo-variants.py`(변형 정규화 후처리), `nemo-kr-apply.py`(침낭·매트 공식명).

1. **무게는 `Packed Weight` 우선 — Minimum/Trail Weight 를 우선하지 말 것.** NEMO 처럼 `Minimum Weight`(트레일)와 `Packed Weight`(패킹)를 둘 다 노출하는 사이트가 많다. 스킬 룰대로 `Packed Weight → Weight → Set Weight`, 셋 다 없을 때만 `Minimum Weight` 폴백. (이번에 Minimum 을 우선했다가 전 품목 무게가 트레일 무게로 잘못 들어갔음.)

2. **변형별 이미지는 개별 `product.json` 의 `variant.image_id` → `images[].id` 로 매핑한다.** 컬렉션 `products.json` 은 variant 에 `featured_image`/`image_id` 가 **없을 수 있다**(NEMO 는 전부 None). 개별 `/products/<slug>.json` 을 받아 `variant.image_id` 가 가리키는 `images[].src` 를 변형마다 넣는다. **색상 변형뿐 아니라 사이즈 변형(매트 Regular/Long Wide 등)도 각자 다른 image_id 를 가진다** → 한 제품에 이미지 한 장 일괄 금지. 매핑 없는 제품(폼매트·풋프린트 등)만 og:image 폴백. (`images[].variant_ids` 로도 역매핑 가능.)

3. **색상 전용 옵션 제품은 변형 라벨이 "사이즈가 아니라 색상"이다.** 스펙 테이블의 변형 컬럼을 무조건 `size` 로 넣으면, 옵션축이 색상 하나뿐인 제품(체어·베개·더플·일부 백팩)에서 **색상이 size 로 누출**된다. `products.json` `options[].name` 으로 축을 판별: `Color` → `color`/`colorKorean`, `Size`/`Capacity`/`Temperature`/`Length` → `size`(이름 끝 부착). 변형 매칭은 `variant.title`(= 옵션값 ` / ` join)로 한다.

4. **영문 글로벌 크롤러도 `colorKorean`/`sizeKorean` 을 반드시 채운다.** 빌더에서 `""` 하드코딩하지 말고 후처리 음역 패스를 돌린다(색상 사전 + 사이즈 음역 + 온도 `°F→℃`). 사이즈는 영문 `name` 끝, 한글 사이즈는 `nameKorean` 끝에 부착(`One Size`/`Default Title` 은 미부착, 색상은 부착 안 함).

5. **한글 모델명은 카테고리별로 KR 공식명과 대조하라 — 음역이 이미 일치하는 경우가 많다.** 니모 코리아(nemoequipment.co.kr godomall) 수집 결과 필로우·체어·백팩·테이블·파우치 6개 카테고리는 config 음역이 공식 모델명과 이미 일치했다. 침낭·매트만 공식 표기 형식이 달랐다(침낭 `리프 맨 15 EP 레귤러` = 모델+℉+EP+사이즈, 매트 `텐서 올 시즌 레귤러/와이드` = 슬래시 구분). **KR 카탈로그가 일부만 노출되면 strict verbatim 은 한 제품 안에서 표기가 섞인다**(매칭분 "15 EP" vs 미매칭분 "-9℃") → 매칭 샘플로 공식 형식을 학습해 전 변형에 일관 생성하고, 생성 결과를 KR 노출명과 대조해 일치율로 검증. (nameKorean 은 공식대로 `℉` 유지, `sizeKorean` 필드는 별도로 `℃` 변환.)

6. **Shopify+Cloudflare WAF 403 은 curl 로 우회.** python `urllib` 의 TLS/헤더 지문이 403 으로 막히면(헤더 추가로 안 풀림 = JA3 지문 문제) `curl`(브라우저 UA) `subprocess` 로 위임. 429 는 지수 백오프 + 요청 간 딜레이. (`collections.json`/`products.json` API 는 curl+UA 로 통과.)

7. **push 전 KR-전용 행의 `_source` 를 카테고리별로 분리.** 여러 KR 소스 파일이 같은 `_source` 문자열(예 `"한국 고시이미지"`)을 쓰면 `push.js` 가 그 source 첫 항목 카테고리로 전부 덮는다(mat+tent 혼합 → 전부 mat). push 전에 `_source = 'brand_' + category` 로 정리. (위 "Firestore push 시 _source 주의" 의 구체 사례.)

### 지팩스(Zpacks) 세션에서 확립한 룰 (일반화)

참고 구현: `zpacks.py`(Shopify products.json + 백팩 HTML data-weight), `sites/zpacks.js`(미리보기 스텁).

1. **push 후 색상 변형이 합쳐지면(문서 수 < 행 수) `findExisting` 의 `name+company` 매치가 color 를 무시한 것.** 색상은 `name` 에 안 넣는 룰(스킬) 때문에, 색상만 다른 변형들이 `name+company` 로만 매칭돼 같은 doc 으로 덮어써진다(데이터 손실). **`push-firestore.js` 의 `name` 매치(및 legacy `name==nameKorean` 매치)에 `color` 를 포함**해야 한다. (Zpacks 1496행 → 첫 push 815문서로 합쳐짐 → color 추가 후 1496문서. push 후 `company` 필터로 문서 수를 행 수와 대조해 검증할 것.)
2. **Shopify `grams` 가 항상 배송무게는 아니다 — 사이트별로 검증하라.** Zpacks 는 `grams` 가 상세 페이지 표시 무게와 정확히 일치(실제 무게). 표본 1~2개의 `grams` ↔ 상세 `data-weight`/스펙표를 대조해 일치하면 `grams` 사용 가능, 어긋나면 스펙표 값 사용.
3. **변형별 무게가 products.json 에 0 인 카테고리(백팩 등)는 상세 HTML 의 `data-...` 속성에서 가져온다.** Zpacks 백팩은 `grams=0` 이고, 상세 페이지에 변형 컨테이너마다 `data-option1/2/3` + `data-weight="X oz / Y g"` + `data-image` 가 있다 → option 값으로 매칭해 변형별 g·이미지 추출. (단 같은 페이지에 부속/add-on 의 작은 `data-weight`(3g·38g 등)가 섞여 오매칭될 수 있으니, `grams` 가 있는 카테고리는 `grams` 우선.)
4. **fit 옵션(허리 벨트 길이 등 무게 영향 미미한 축)은 전개하지 않고 접는다.** 백팩은 색상×토르소×스트랩만 전개하고 벨트 길이는 대표 1개로 접어 행 폭발 방지(색상×토르소×스트랩×벨트 2454행 → 618행). `(groupId, color, size)` dedup 으로 접는다.
5. **결합 옵션값 분해.** `"Color | Torso"` 옵션명은 ` | ` 로, `"Blue w/ Lite Floor"` 값은 ` w/ ` 로 쪼개 색상/사이즈(구성)로 분리한다.

### 엑스패드(Exped) 세션에서 확립한 룰 (일반화)

1. **🔴 정규식 교대(`|`) 순서 — 사이즈/옵션 토큰은 긴 것부터 나열하라.** Python `re` 의 교대는 *최장 매치가 아니라 먼저 나온 대안* 을 택한다. `(?:M|MW)` 는 `"MW"` 에서 **`M` 만** 잡는다. 사이즈 토큰 정규식 `SIZE_HEAD` 에 단일(`S|M|L|W`)을 복합(`LXW|MW\+|LW\+|MW|LW|SW|XL|XXL`)보다 **앞에** 두면, `findall(SIZE_HEAD, "MW LW LXW")` 가 `['M','W','L','W','L','W']` 로 쪼개져 사이즈-무게 매핑이 전부 어긋난다(엑스패드 딥슬립 무게 전멸 → 원인). **복합/긴 토큰을 먼저, 단일 글자를 맨 뒤에** 배치할 것. `match`(앵커드)도 같은 함정 — `^(?:M|MW)` 는 "MW사이즈"에서 M 만 잡는다. 대소문자 변형(`UNO` vs `Uno`)도 각각 등재하거나 정규화.

국내 브랜드(코베아 등)는 무게·크기·재질이 **본문 텍스트가 아니라 긴 상세 이미지** 안에 있다. 한국 표준 "상품 정보 제공 고시" 표(크기/중량/재질/수용인원/내수압)가 이미지 하단에, 일부는 영문 "Specification" 표가 들어있다. 도구·스크립트: `ocr.py`(범용 Vision OCR), `kovea-specs.py`(고시/Spec 파싱), `kovea-fixweight.py`(위치기반 무게/내하중), `kovea-sleeptemp.py`(침낭 온도), `kovea-imgcolor.py`(이미지 색상항목), `kovea-options.py`(옵션 변형), `kovea-sitemap-add.js`(사이트맵 전체 제품).

**OCR (`ocr.py`):**
- pyobjc로 macOS Vision 사용 (`pip install pyobjc-framework-Vision pyobjc-framework-Quartz`). swift는 베타 SDK 충돌로 막힐 수 있어 pyobjc가 안전.
- **한국어(ko-KR)는 이 머신에서 fast 레벨(0)에서만 지원** — accurate(1)는 라틴 전용. `setRevision_(3)` + `setRecognitionLevel_(0)`.
- **긴 이미지(900×20000px 등)는 Vision이 다운샘플해 글자가 깨진다 → 반드시 ~1500px 타일로 잘라 OCR.** 직접 통짜 OCR 금지.
- 바운딩박스(x,y)를 주므로 **라벨↔값을 같은 행(y)으로 정렬** 가능 — 세로 컬럼 레이아웃(라벨열/값열 분리: `규격/중량/내하중` → `…/1.45kg/120kg`)에서 필수. 텍스트만으로 파싱하면 중량 옆에 온 내하중 값을 무게로 오인한다.

**무게/스펙 파싱 함정 (실제 겪음):**
- 셀 "중량 : 970 / 내하중 : 30kg" → 단위 없는 970(=970g)을 건너뛰고 30kg(내하중)을 무게로 잡음. **라벨별로 sub-값을 분리**하고, 단위 없는 숫자는 `<50 ⇒ kg, 그외 ⇒ g`로 추정.
- 고시 표는 **마지막 상세 이미지 하단**에 있는 경우가 대부분이나 부속 이미지가 뒤에 붙으면 끝에서 2~3번째에 있다 → 마지막 3장 스캔.
- 침낭 온도는 하단 고시가 아니라 **이미지 중간**에 ISO 23537 표("Comfort 15°C~0°C / Lower Limit") 또는 3단계 "N°C / °F"(쾌적/숙면/극한)로 있다. **세탁 온도(물 30°C)는 `/°F` 페어 조건으로 제외**.

**색상 — 3소스 결합:**
1. 이름의 **`[그레이]` 대괄호** 또는 `(블루)` 소괄호 (색상 키워드일 때만; 메쉬/하드탑/M 등 변형어는 제외)
2. 이미지 **"색상" 항목** OCR (단일 색상만 채택, "Moss / Black"처럼 복수 선택지는 비움). 영문→한글 변환(Sand→샌드).
3. **Cafe24 옵션 셀렉트** → 옵션마다 개별 제품 행(같은 groupId, 색상/사이즈 다름). **색상·사이즈 옵션만 확장** — "기타" 옵션(폴 길이·모델호환)까지 cartesian 하면 수천 행 폭발. `[A/S SHOP]` 스페어부품은 제외.

**완전 수집 — 사이트맵:** 카테고리 리스팅은 품절·단종을 누락한다. `/sitemap.xml`이 전체 제품(품절 포함)을 담으므로 마스터로 쓰고, 사이트맵엔 카테고리가 없으니 **제품명 키워드로 분류**(국내 브랜드는 이름에 종류 명시). 단 브레드크럼은 유입경로(리퍼존/기획전)라 카테고리로 못 씀.

**데이터 미존재 구분:** 무게 0이 추출 버그인지 데이터 부재인지 — 표본 OCR로 이미지에 중량 표기가 아예 없으면 사이트에 데이터가 없는 것(액세서리·신상 다수). 어댑터로 해결 불가.

### Firestore push 시 _source 주의 (코베아/몽벨 공통)

`push.js`는 비대화형에서 **`_source`별로 카테고리를 일괄 적용**한다(그 source 첫 항목의 category). 한 source에 여러 카테고리가 섞이면(예: 몽벨 c=34=침낭+매트, 코베아 sitemap source) 전부 한 카테고리로 덮인다 → **push 전에 `_source = 'brand_' + category`로 정리**해 source-카테고리를 1:1로 맞춘다. push는 `node@20 push.js <json>` (firebase-admin은 Node 20 필요).

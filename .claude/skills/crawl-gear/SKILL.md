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

상품 카드 셀렉터를 모를 때는 `discover.js`만으로는 부족. 한 카테고리 페이지에 대해 puppeteer 일회성 스크립트로 DOM 덤프해서 셀렉터 확인:
```js
// 임시 스크립트 — 카드 컨테이너의 outerHTML 일부를 보고 셀렉터 결정
document.querySelectorAll('[class*="product"], [class*="card"], [class*="item"]')
```

### 3.5. 모든 카테고리 spec 추출 블록 작성 (중요)

신규 브랜드 어댑터 만들 때 **그 브랜드가 다루는 모든 카테고리의 spec 추출 블록을 fetchDetail에 함께 작성**.

순서:
1. `CATEGORY_MAP`에서 그 브랜드가 다루는 카테고리 키 목록 추출
2. 각 카테고리당 sample detail page 1개씩 puppeteer로 방문 → spec 행 덤프
3. 덤프 결과를 보고 `specs-schema.js`의 해당 카테고리 필드 중 추출 가능한 것 매핑
4. `if (cat === 'XXX') { ... }` 블록 추가

각 카테고리별로 sample URL 1개씩 골라서 한 번에 detail 페이지 비교:
```js
const samples = {
  backpack: 'https://...',
  clothing: 'https://...',
  // ... 각 카테고리당 1개
};
// puppeteer로 모든 sample 방문 → li 행 / spec rows 출력
// 출력 보고 카테고리별 추출 패턴 결정
```

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

1. **discover.js로 사이트 탐색** — 카테고리 후보 URL 파악
2. **카드 셀렉터 한 번 확인** — 일회성 puppeteer 스크립트로 한 카테고리 페이지 DOM 덤프
3. **detail 페이지 spec 위치 확인** — 표/리스트/탭/lazy-load 여부 파악
4. **어댑터 초안 작성** — `sites/rab.js` 또는 `sites/msr.js` 복사 후 셀렉터/패턴만 교체
5. **`--no-weight --no-open` 으로 리스팅 검증** — 빠르게 (1분 안) 카드 추출 확인
6. **한 카테고리만 풀 크롤** — `--categories=<URL>` 로 spec 추출까지 검증
7. **HTML 미리보기 확인** — 데이터 누락/오류 파악
8. **수정 → 재실행** — 한 카테고리에서 잘 되면 다음 카테고리 추가
9. **풀 크롤** — 모든 카테고리 한 번에

### 사이트 유형별 흔한 패턴

| 사이트 유형 | 식별 단서 | 주요 셀렉터 |
|---|---|---|
| **Shopify** | `cdn.shopify.com` 자산, `.shopify-section` | `.card-wrapper`, `[data-product-id]`, `.product-grid > *` |
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

### 디버깅 일회성 스크립트 템플릿

탐색용 puppeteer 스크립트:
```js
node -e "
import('puppeteer').then(async ({default: p}) => {
  const b = await p.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await b.newPage();
  await page.setUserAgent('Mozilla/5.0 Chrome/120.0.0.0');
  await page.goto('<URL>', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  const r = await page.evaluate(() => {
    // 여기에 탐색 코드
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

## 변형 처리

같은 제품의 색상/사이즈/무게가 다르면 별도 행, 같은 `groupId`로 묶임.

현재는 리스팅에 노출된 색상 1개만 추출 (간단). 다른 색상은 같은 URL 슬러그면 같은 `groupId`로 묶이도록 설계됨. 다중 색상 추출은 사이트마다 별도 작업.

## 사전 준비

### 다른 컴퓨터에서 처음 쓸 때 (의존성)

스킬 파일·데이터는 레포에 포함돼 git clone 으로 동기화된다. 추가로 필요한 것:

1. **Node 의존성** — 레포 루트에서 `npm install` (이미 `package.json` 에 `puppeteer`, `firebase-admin` 선언됨). 워크트리면 글로벌 규칙대로 메인 클론 `node_modules` 를 심링크.
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

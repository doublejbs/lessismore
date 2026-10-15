# 크롤 파이프라인 카테고리 수정 요청 (핸드오프)

**대상 레포**: `lessismore` (웹/크롤 파이프라인) — `specs-schema.js`의 카테고리 정의
**요청자 쪽 변경**: `lessismore-app` (앱) `develop` 브랜치, 커밋 `74575d6`·`5787901`·`5262ce7`
**작성일**: 2026-08-09

---

## 0. 배경 — 왜 필요한가

앱의 장비 카테고리는 **2단 체계**다.

- `gear.category` 필드에 **세분 카테고리 키 하나만** 저장한다. 큰 분류(그룹)는 저장하지 않고 앱이 역산한다.
- 그 세분 키를 **크롤 파이프라인이 정한다.**

2026-08-09에 앱 쪽에서 세분 카테고리를 정리하고 **기존 데이터 2,679건을 이관**했다(카탈로그 1,786 + 사용자 창고 893). 그런데 **새로 들어오는 상품의 카테고리는 여전히 크롤 파이프라인이 정하므로, 파이프라인을 고치지 않으면 폐기한 키가 다시 쌓인다.**

정리한 내용은 세 가지다.

1. **그룹 키와 이름이 같아 모호하던 세분 키를 폐기** — `cooking`·`lantern`·`furniture`
   (예: `category: "cooking"` 이 "조리 그룹"인지 "조리라는 세부 분류"인지 구분 불가)
2. **없던 세분 키를 신설** — `cookware`, `headlamp`, `furniture_etc`
3. `clothing`은 값을 유지하고 **표시 라벨만** `의류` → `일반` 로 변경 (22,889건이라 이동 비용이 큼)

---

## 1. 해야 할 일 (요약)

| # | 작업 | 대상 키 |
| --- | --- | --- |
| 1 | 세분 키 **신설** | `headlamp`, `cookware`, `furniture_etc` |
| 2 | 세분 값으로 **출력 중단** | `cooking`, `lantern`, `furniture` |
| 3 | 표시 라벨 **변경** | `clothing`: `의류` → `일반` |
| 4 | 분류 로직에 신설 키 반영 | 아래 §3 규칙 참고 |
| 5 | 기존 문서 필드 **보존** 확인 | `productImageUrl` (아래 §5) |

> `cooking`·`lantern`·`furniture`는 앱에서 **그룹 멤버로는 계속 유지**한다(커스텀 장비 호환).
> 즉 그 값이 들어와도 앱이 깨지지는 않지만, 세부 분류가 안 된 상태로 남는다. **새로 쓰지 말 것.**

---

## 2. 최종 카테고리 계약 (이게 정본)

앱 `model/gear/GearCategoryGroups.ts` 기준. 세분 키의 한글 라벨은 웹 `CATEGORY_LABELS`와 동일하게 유지하는 것이 원칙이다.

| 그룹 (앱 필터) | 세분 키 → 라벨 |
| --- | --- |
| `tent` 텐트 | `tent` 텐트 · `tarp` 타프 · `shelter` 쉘터 · `tent_acc` 텐트ACC |
| `sleeping_bag` 침낭 | `sleeping_bag` 침낭 |
| `mat` 매트 | `mat` 매트 · `pillow` 필로우 |
| `backpack` 배낭 | `backpack` 배낭 · `vest_pack` 베스트 배낭 · `backpack_cover` 배낭 커버 · `pouch` 파우치/수납가방 |
| `clothing` 의류 | **`clothing` 일반** ← 라벨 변경 · `gloves` 장갑 · `gaiter` 스패츠 · `sunglasses` 선글라스 |
| `furniture` 가구 | `chair` 체어 · `table` 테이블 · **`furniture_etc` 그 외 기타** ← 신설 |
| `lantern` 랜턴 | `lighting` 조명 · **`headlamp` 헤드랜턴** ← 신설 |
| `cooking` 조리 | **`cookware` 코펠·쿡웨어** ← 신설 · `stove` 버너 · `torch` 토치 · `cup` 컵 · `bowl` 그릇 · `cutlery` 수저 · `bottle` 물통 · `cookware_etc` 식기류 기타 |
| `electronic` 전자기기 | `electronic` 전자기기 |
| `food` 음식 | `food` 식품 |
| `etc` 기타 | `etc` 그 외 기타 · `towel` 수건 · `hand_warmer` 핫팩 · `shovel` 삽 · `hammer` 망치 · `microspikes` 아이젠 · `trekking_pole` 트레킹폴 |

**폐기(세분 값으로 출력 금지)**: `cooking`, `lantern`, `furniture`

---

## 3. 분류 규칙 (앱에서 이관에 실제로 쓴 것 — 그대로 재사용 가능)

이관 스크립트가 쓴 규칙이다. 크롤 쪽 분류 로직에 이식하면 앱 데이터와 결과가 일치한다.
원본: `lessismore-app` 레포의 `scripts/lib/CategorySplitRules.mjs`, `scripts/lib/HeadlampRule.mjs`

판정 문자열은 **브랜드(한/영) + 상품명(한/영)을 이어 붙인 것**을 쓴다.

### 3-1. 헤드랜턴 (`lighting` vs `headlamp`)

```js
// 1차: 이름에 '헤드 + 램프/랜턴/라이트'
/헤드\s*(램프|랜턴|라이트)|head\s*(lamp|torch)|headlamp|headlight/i

// 2차: 모델명만 적혀 1차로 못 잡는 라인 (전 모델이 헤드랜턴)
/(나이트코어|nitecore).*\b(NU|HC)\s?\d/i
/(블랙다이아몬드|black\s*diamond).*(코스모|스프린터|스프린트|cosmo|sprint)/i
/크레모아.*헤디/
```

둘 중 하나라도 맞으면 `headlamp`, 아니면 `lighting`.
※ 블랙다이아몬드 **랜턴** 라인은 모지·올빗·아폴로라 위 규칙과 겹치지 않는다.

### 3-2. 가구 (`chair` / `table` / `furniture_etc`)

위에서부터 먼저 맞는 것을 쓴다.

```js
[/체어|의자|스툴|chair|stool|해먹|hammock|코트|cot\b|간이침대/i, 'chair'],
[/테이블|상판|table|선반|랙|rack/i,                              'table'],
// 아무것도 안 맞으면 'furniture_etc'
```

### 3-3. 조리 (순서 중요)

```js
// 물통이 먼저. 날진 제품군은 '보틀' 대신 입구 규격/모델명으로만 불린다.
[/물통|보틀|bottle|캔틴|캔텐|canteen|드로미더리|dromedary|하이드레이션|hydration|블래더|bladder|수통|내로우\s?마우스|와이드\s?마우스|narrow\s?mouth|wide\s?mouth|시퍼|sipper|워터\s?(팩|백)|날진|nalgene|플라스크|flask/i, 'bottle'],

[/토치|torch/i, 'torch'],

// 버너. 모델명이 곧 버너인 라인을 포함 — 아래 쿡웨어의 '시스템'에 먼저 걸리면 안 되므로 위에 둔다.
[/버너|스토브|스토프|burner|stove|윈드스크린|windscreen|화로|가스\s?카트리지|연료통|윈드\s?(마스터|프로|버너)|wind\s?(master|pro|burner)/i, 'stove'],

// 컵이 쿡웨어보다 먼저 — '시에라'(시에라컵)가 쿡웨어 세트 규칙에 먼저 걸리면 안 된다.
[/머그|컵|텀블러|잔|시에라|mug|cup|tumbler|sierra/i, 'cup'],

// 코펠·쿡웨어 — 이번에 신설한 자리. 한국어 표기가 제각각(포트/팟/팬/코펠/쿡셋/쿠기세트)이라 넓게 잡는다.
[/쿡|쿠커|쿠기|코펠|케틀|캐틀|주전자|냄비|프라이팬|팬|포트|팟|논스틱|스킬렛|그리들|보일러|콤보|시스템|트렉\s?\d|cookset|cooker|kettle|pot\b|pan\b|skillet/i, 'cookware'],

[/그릇|보울|볼|접시|플레이트|트레이|도시락|런치박스|용기|식기|종지|bowl|plate|tray|lunch\s?box/i, 'bowl'],

[/수저|젓가락|찹스틱|스푼|포크|나이프|커틀러|커트러|스포크|집게|스페츌라|스패출러|스패츌러|휘스크|주걱|국자|텅|탕스|오피넬|chopstick|spoon|fork|knife|cutlery|spork|tong|opinel/i, 'cutlery'],

// 아무것도 안 맞으면 'cookware_etc'
```

---

## 4. ⚠️ 함정 — 한글 뒤에 `\b`(단어 경계)를 쓰지 말 것

`\b`는 **ASCII 단어문자 기준**이라 한글 뒤에서는 경계가 서지 않는다.

```js
/컵\b/.test('싱글컵 320ml')   // false  ← '컵'도 공백도 비단어라 경계 없음
/컵/.test('싱글컵 320ml')     // true
```

이 실수로 컵·팬·볼이 전부 `식기류 기타`로 떨어졌었다(오분류 256건 → 규칙 수정 후 95건).
규칙을 손볼 때 재발 주의. **영문 단어에만 `\b`를 쓴다**(`pot\b`, `pan\b`, `cot\b`는 의도된 것).

---

## 5. ⚠️ 기존 필드 보존 — `productImageUrl`

앱이 2026-08-09부터 `gear/{id}.productImageUrl` 필드를 **직접 쓴다**(브랜드 상품 페이지의 `og:image` URL, 링크 미리보기 카드용).

**크롤 파이프라인이 gear 문서를 통째로 덮어쓰면 이 값이 날아간다.**
- `set()` 전체 덮어쓰기 대신 `merge` 또는 필드 단위 `update`를 쓰거나,
- 최소한 `productImageUrl`을 페이로드에서 제외해 보존할 것.

같은 이유로 `bags`·`used`·`useless`(사용자 기록성 필드)도 카탈로그 문서에서 건드리지 않는 것이 안전하다.

---

## 6. 검증

파이프라인 수정 후, 신규 크롤 결과에 대해:

```
✅ category 값에 'cooking' | 'lantern' | 'furniture' 가 하나도 없어야 한다
✅ 헤드랜턴 상품이 'headlamp' 로 들어간다
✅ 쿡셋/쿠커/포트류가 'cookware' 로 들어간다
✅ 체어·테이블이 아닌 가구가 'furniture_etc' 로 들어간다
✅ 기존 문서의 productImageUrl 이 유지된다
```

앱 쪽 현재 분포(2026-08-09 이관 완료 시점, 카탈로그 41,400건):

```
cooking 0 · lantern 0 · furniture 0        ← 폐기 완료
cookware 174 · headlamp 98 · furniture_etc 0
lighting 123 · chair 192 · table 201
```

---

## 7. 덤 — 파이프라인이 만든 것으로 보이는 이상 데이터

이번 정리 중 카탈로그(`/gear`)에서 발견한 것들. 이번 요청 범위는 아니지만 파이프라인 쪽에서 손대는 게 맞아 보인다.

| 항목 | 건수 | 비고 |
| --- | --- | --- |
| `category: "bag"` | 4 | 정의에 없는 키. 앱에서 `etc` 그룹으로 폴백 중 |
| `category: "test"` | 2 | 테스트 데이터로 보임 |
| `secondaryCategory` 필드 | 1 | 앱이 읽지 않음. `tertiaryCategory`는 0건 |
| `lighting`에 섞인 비조명 | 다수 | 캠핑코트(침대)·경량코트·슬림 트윈 스토브(버너)·BD 배터리·랜턴 액세서리(글로브/맨틀/쉐이드/랜턴행거/파일드라이버) |
| `productUrl` 없음 | 3,797 (9.2%) | 조리도구 98%·의자 73%·텐트 48%·침낭 40%가 비어 있음 |
| `productUrl` 죽은 링크 | 약 356 (0.9%) | 대부분 `msrgear.co.kr` (표본 25건 중 18건 404, 보유 269건). URL이 퍼센트 인코딩된 한글 경로라 사이트 개편 때 깨진 것으로 보임 |

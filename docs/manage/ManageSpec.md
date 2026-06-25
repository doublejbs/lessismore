# 장비 관리(manage) 기능 스펙

> 이 문서는 `/manage` 화면의 **현재 동작을 사실 그대로 명세**한 것이다. 코드와 이 문서가 어긋나면 둘 중 하나가 버그다 — 변경 작업 전에 반드시 이 문서를 먼저 갱신한다(스펙 우선). 운영·작업 규칙은 루트 [`CLAUDE.md`](../../CLAUDE.md)를 따른다.

## 1. 개요

`manage`는 등산/백패킹 장비 카탈로그(Firestore `gear` 컬렉션)를 관리하는 **관리자 전용 단일 화면**이다. 일반 사용자용 기능이 아니라, 허용된 운영자만 접근해 장비 데이터를 직접 추가·수정·삭제하고 이미지/한글명을 보강하는 도구다.

- **진입 경로**: `/manage` (SPA 라우트, [`src/App.tsx`](../../src/App.tsx))
- **핵심 코드 위치**: [`src/manage/`](../../src/manage/)
  - `ManageView.tsx` — 화면(UI) 조립, 테이블/툴바/모달
  - `model/Manage.ts` — 상태·비즈니스 로직 (MobX `makeAutoObservable`)
  - `store/ManageStore.ts` — 데이터 접근 (Firestore + Algolia)
  - `model/ManagerGear.ts` — 장비 도메인 모델
  - `GearRow.tsx` — 테이블의 한 행(인라인 편집 포함)
  - `columns/` — 셀 컴포넌트들
  - `component/` — 추가/엑셀/네이버 이미지 모달
  - `SearchInput.tsx`, `SaveKoreanNameButtonView.tsx`, `UploadButton.tsx`

## 2. 아키텍처 / 데이터 흐름

```
ManageView (관찰자, antd Table)
   │  사용자 액션
   ▼
Manage (MobX 모델 · 상태/페이지네이션/선택)
   │  CRUD 호출
   ▼
ManageStore (Firestore 'gear' / Algolia 'useless-gear-search')
```

- `ManageView`는 `Manage.new()`로 모델을 1회 생성해 컴포넌트 수명 동안 보관한다.
- 모든 쓰기 작업(`updateXxx`, `addGear`, `deleteGear(s)`)은 완료 후 **`resetList()`로 목록을 처음부터 다시 로드**한다. 단, `updateGear`만 예외로 로컬 `items`를 인메모리로 갱신한다(전체 재로딩 안 함).
- 화면 갱신은 MobX `observer`로 자동 반영된다.

## 3. 접근 제어

[`ManageView.tsx`](../../src/manage/ManageView.tsx) 상단에서 3단계로 제어한다.

1. **비로그인** → Google 로그인 버튼만 표시 (`firebase.logInWithGoogle()`)
2. **로그인했지만 미허용 UID** → "접근 권한이 없습니다." 표시
3. **허용 UID** → 관리 화면 렌더링

허용 UID는 컴포넌트 내 하드코딩 상수다.

```ts
const ALLOWED_UIDS = ['M3yk9SzrGZN3veiyd2SE6LmTrsk1', 'KkmaLpxPYLbmJKGkSTLMuMcD5l82'];
```

> ⚠️ 접근 제어가 **클라이언트 사이드에만** 존재한다. 실제 데이터 보호는 Firestore 보안 규칙에 의존한다(이 레포 범위 밖). 운영자 추가/변경 시 이 상수를 직접 수정한다.

## 4. 데이터 모델

### 4.1 `ManagerGear` ([`model/ManagerGear.ts`](../../src/manage/model/ManagerGear.ts))

| 필드 | 타입 | 비고 |
|---|---|---|
| `id` | `string` | Firestore 문서 ID |
| `name` | `string` | 영문/원문 이름 (필수) |
| `nameKorean` | `string` | 한글 이름 (기본 `''`) |
| `company` | `string` | 브랜드(영문) (필수) |
| `companyKorean` | `string` | 브랜드(한글) (필수) |
| `weight` | `string` | 모델에선 문자열, 저장 시 숫자로 변환 |
| `category` | `string` | 1차 카테고리 (필수) |
| `secondaryCategory` | `string?` | 2차 카테고리 (기본 `''`) |
| `tertiaryCategory` | `string?` | 3차 카테고리 (기본 `''`) |
| `color` | `string?` | 색상(영문) (기본 `''`) |
| `colorKorean` | `string?` | 색상(한글) (기본 `''`) |
| `size` | `string?` | 사이즈(영문) (기본 `''`) |
| `sizeKorean` | `string?` | 사이즈(한글) (기본 `''`) |
| `imageUrl` | `string` | 대표 이미지 URL (기본 `''`) |
| `createDate` | `number` | 등록 시각 `Date.now()` (ms) |

### 4.2 Firestore `gear` 문서

`addGear` 시 위 필드에 더해 다음이 함께 저장된다([`ManageStore.addGear`](../../src/manage/store/ManageStore.ts)).

- `weight: +weight` — **숫자로 변환** (`+(value || 0)`)
- `isCustom: false`
- `bags: []`, `used: []`, `useless: []` — (앱의 다른 기능에서 사용하는 관계 필드, manage에선 빈 배열로 초기화만 함)
- `createDate: Date.now()`

> `gear` 컬렉션은 manage 외 앱 기능(가방 구성 등)도 함께 읽는 **공유 데이터**다. 필드를 추가/삭제할 때는 다른 소비자 영향을 반드시 확인한다.

### 4.3 실데이터 스키마와 manage 처리 범위

`gear` 컬렉션에는 **두 종류의 쓰기 주체**가 있다.

- **crawl-gear 파이프라인** ([`.claude/skills/crawl-gear/push-firestore.js`](../../.claude/skills/crawl-gear/push-firestore.js)) — 브랜드 공식몰을 크롤해 `color`/`colorKorean`, `size`/`sizeKorean`, `groupId`, `specs`(material/type/isWaterproof 등 객체)까지 풀 스키마로 기록한다.
- **manage 화면** — 운영자가 직접 추가/편집.

manage는 위 필드 중 **`colorKorean`, `size`, `sizeKorean`까지 표시·편집을 지원한다**(이 절 기준). 단, `groupId`와 `specs`는 **manage에서 표시·편집하지 않는다**(크롤 파이프라인이 관리). 인라인 편집은 `updateDoc(부분 필드)`라 manage가 모르는 `groupId`/`specs`는 **덮어쓰지 않고 보존**된다.

## 5. 데이터 소스 (이원화)

[`ManageStore.getList`](../../src/manage/store/ManageStore.ts)는 `searchText` 유무로 소스를 가른다.

- **검색어 없음 → Firestore 직접 쿼리**
  - `query(collection('gear'), orderBy(sortField, sortOrder), limit(100))`
  - 페이지네이션: `startAfter(lastDoc)` 커서 방식, 한 번에 100개
- **검색어 있음 → Algolia 검색**
  - 클라이언트: `liteClient('BWS6CWRXRM', '<search-only-key>')`
  - 인덱스: `useless-gear-search`, `hitsPerPage = limit(100)`, `page: 0`
  - **정렬은 프론트엔드에서** `sortField`/`sortOrder` 기준으로 직접 수행
  - **페이지네이션 없음** (`lastDoc: null` → 추가 로드 불가, 첫 페이지 결과만 노출)

> Firestore 분기 내부에도 `searchText` 기반 `where` 코드가 남아 있으나, 진입 조건상 항상 빈 문자열이라 **실질적으로 도달하지 않는 경로(dead branch)**다. (현재 동작 기록 — 정리는 별도 작업)

## 6. 기능 명세

### 6.1 목록 조회 · 무한 스크롤 · 정렬

- 최초 진입 시 `resetList()` → `fetchNextPage()`로 첫 100개 로드.
- antd `Table`의 실제 스크롤 컨테이너(`.ant-table-body`)에 `IntersectionObserver`를 걸어, 하단 로더 행이 보이면 `canFetchMore()`일 때 `fetchNextPage()` 호출.
- `canFetchMore = hasMore && !loading`. 받은 개수가 100 미만이면 `hasMore = false`.
- **정렬**: 컬럼 헤더 클릭 → `onChange` → `Manage.setSort(field, order)` → `resetList()`로 재조회. 정렬 가능 컬럼: 이름, 이름(한글), 회사, 회사(한글), 무게, 카테고리, 2·3차 카테고리, 등록일.
- 표시 컬럼: 체크박스 / 이름 / 이름(한글) / 회사 / 회사(한글) / 이미지(썸네일) / 이미지URL / 색상 / 색상(한글) / 사이즈 / 사이즈(한글) / 무게 / 카테고리 / 2차 / 3차 / 등록일 / 액션.
- 색상(한글)·사이즈·사이즈(한글)은 색상과 동일하게 **정렬 비대상**이다(자유 텍스트 + Firestore 인덱스 부담 회피).

### 6.2 검색 ([`SearchInput.tsx`](../../src/manage/SearchInput.tsx))

- "이름으로 검색" 입력 → **300ms 디바운스** 후 `Manage.setSearch(value)` → `resetList()`.
- 검색은 Algolia 인덱스를 통해 수행(§5).
- 디바운스 타이머를 `window.searchDebounce` 전역에 보관(현재 구현).

### 6.3 행 인라인 편집 ([`GearRow.tsx`](../../src/manage/GearRow.tsx))

- "수정" 클릭 → 해당 행이 편집 모드로 전환, 모든 셀이 입력 필드로 바뀜.
- 편집 가능 필드: name, nameKorean, company, companyKorean, imageUrl(텍스트 + 파일 업로드), color, colorKorean, size, sizeKorean, weight, category, secondary/tertiaryCategory.
- "저장" → (파일이 선택된 경우) **Firebase Storage에 직접 업로드** 후 `imageUrl` 교체 → `Manage.updateGear(id, values)` 호출.
  - 파일명: `{company}_{name}_{category}_{timestamp}.{ext}` (영숫자·한글 외 문자는 `_`로 치환)
  - 업로드 경로: `gears/{fileName}` ([`FirebaseImageStorage.uploadFileToPublic`](../../src/firebase/FirebaseImageStorage.ts))
- "삭제" → `window.confirm` 확인 후 `Manage.deleteGear(id)`.
- "이미지 서버로 업로드"([`UploadButton`](../../src/manage/UploadButton.tsx)) → `Manage.uploadAndUpdateImageUrl`(§7.2) 호출.

#### `Manage.updateGear` 이미지 처리 규칙

`updateGear`는 다음 **모든 조건**을 만족할 때만 imageUrl을 업로드 서버로 보내 교체한다.
- `imageUrl`과 `name`이 존재하고, `imageUrl`에 `https://`가 포함되며, `googleapis.com`이 **포함되지 않을 때**.
- 즉 이미 Storage(googleapis.com)에 올라간 URL은 재업로드하지 않는다.

### 6.4 장비 추가 ([`component/AddGearModal.tsx`](../../src/manage/component/AddGearModal.tsx))

- "장비 추가" 버튼 → 모달.
- 필수: 이름, 회사, 회사(한글), 카테고리. 선택: 무게(기본 0), 색상, 색상(한글), 사이즈, 사이즈(한글), 이미지 파일.
- 이미지 파일 선택 시 Storage `gears/`에 직접 업로드 후 그 URL로 등록.
- 등록은 `Manage.addGear` → `ManageStore.addGear`(§4.2 필드 세팅) → `resetList()`.

### 6.5 엑셀 일괄 추가 ([`component/AddGearExcelModal.tsx`](../../src/manage/component/AddGearExcelModal.tsx))

- "엑셀로 장비 추가" 버튼 → 모달. `.xlsx/.xls` 파싱(`XLSX.read`), 첫 시트만 사용.
- **카테고리 한글→영문 매핑** 적용. 매핑 표:

  | 한글 | 영문 | 한글 | 영문 |
  |---|---|---|---|
  | 텐트 | `tent` | 가구 | `furniture` |
  | 침낭 | `sleeping_bag` | 조명 | `lantern` |
  | 배낭 | `backpack` | 조리 | `cooking` |
  | 의류 | `clothing` | 기타 | `etc` |
  | 매트 | `mat` | (그 외) | `etc` |

- 수동 이미지 업로드: 파일명을 `회사_이름_색상.ext`로 파싱해 행으로 추가.
- "확인" → **6개씩 배치**로 등록.
  - `imageFile`이 있으면 Storage에 업로드(파일명은 `uuid`).
  - `imageUrl`이 있으면 `Manage.uploadImageUrl`(§7.3)로 서버 경유 업로드 후 그 URL 사용.
  - `Manage.addGearOnly`로 등록(이 경로는 **`resetList()`를 호출하지 않음** → 등록 후 목록 자동 새로고침 없음, 모달은 닫힘).
  - 실패한 행 번호(1-based)를 모아 경고 메시지로 안내.
- "이미지 다운로드" 기능은 제거됨(안내 메시지만 표시, imageUrl 그대로 등록).

### 6.6 네이버 쇼핑 이미지 가져오기 ([`component/NaverShoppingImageModal.tsx`](../../src/manage/component/NaverShoppingImageModal.tsx))

- 선택된 항목이 1개 이상일 때만 버튼 활성화.
- "이미지 URL 가져오기" → 선택 장비를 순회하며 Cloud Function `naverShoppingSearch` 호출.
  - 검색 쿼리: `"{company} {companyKorean} {name} {color}"`
  - 첫 번째 검색 결과 이미지(`items[0].image`)를 후보로 보관(아직 저장 아님).
  - 호출 간 100ms + 200ms 지연, 진행률 `Progress` 표시.
- "네이버 쇼핑 이미지 URL 저장하기" → 보관된 후보들을 `Manage.updateImageUrl`로 일괄 저장.
- 표에 현재 이미지 vs 네이버 후보 이미지를 나란히 비교.

### 6.7 한글 이름 저장 ([`SaveKoreanNameButtonView.tsx`](../../src/manage/SaveKoreanNameButtonView.tsx))

- 선택된 장비의 `name`을 **한글 발음으로 변환**해 `nameKorean`에 저장(`Manage.updateNameKorean`).
- 변환 로직(클라이언트, 외부 API 없음):
  1. 영문 글자 비율이 50% 이하면 이미 한글로 보고 원문 유지.
  2. 아웃도어 용어 사전(`commonWords`, 수백 개)에서 단어 단위 우선 매칭.
  3. 사전에 없으면 음성학 규칙(`patterns`)으로 근사 음차 변환.
  4. 공백/`-`/`_`/상표기호로 토큰 분리 후 단어별 변환, 공백으로 결합.
- 성공/실패 건수를 메시지로 안내.

> 규칙 기반 근사 변환이라 정확하지 않을 수 있다. 저장 후 운영자가 행 인라인 편집으로 보정하는 운영 흐름을 전제한다.

### 6.8 다중 선택 · 일괄 삭제

- 헤더 체크박스로 현재 로드된 항목 전체 선택/해제(`selectAll`/`clearSelected`), 행 체크박스로 개별 선택(`selectGear`). 선택 상태는 `Manage.selectedIds`.
- "선택 삭제" → `window.confirm` 후 `Manage.deleteGears(ids)`가 Firestore `writeBatch`로 일괄 삭제 → `resetList()` → 선택 해제.
- 선택 상태는 "네이버 이미지", "한글 이름 저장", "선택 삭제" 기능의 입력으로 공유된다.

## 7. 외부 의존성

### 7.1 Firebase
- **Firestore**: `gear` 컬렉션 (읽기/쓰기/배치 삭제)
- **Storage**: `gears/{fileName}` 공개 경로 직접 업로드 ([`FirebaseImageStorage`](../../src/firebase/FirebaseImageStorage.ts))
- **Auth**: Google 로그인

### 7.2 이미지 업로드 서버 (Cloud Run) — `uploadAndUpdateImageUrl`
- `POST https://uploadimage-434364025032.asia-northeast3.run.app`
- body `{ imageUrl, name }` → `{ downloadURL }`
- 성공 시 해당 장비 `imageUrl` 업데이트 + `resetList()`.

### 7.3 이미지 업로드 서버 (Cloud Functions) — `uploadImageUrl`
- `POST https://uploadimagefromurl-uaz7njqewq-du.a.run.app`
- body `{ imageUrl, name }` → `{ downloadURL }` (`'true'`면 `null` 처리)
- 엑셀 일괄 등록(§6.5)에서 외부 이미지 URL을 서버 경유로 저장할 때 사용.

### 7.4 네이버 쇼핑 검색 — Cloud Function
- `GET https://asia-northeast3-lessismore-7e070.cloudfunctions.net/naverShoppingSearch?query=...`
- 구현: [`functions/index.js`](../../functions/index.js) `naverShoppingSearch` (region `asia-northeast3`)

### 7.5 Algolia
- 검색 전용 클라이언트, 인덱스 `useless-gear-search`. 인덱싱 파이프라인은 이 화면 밖(별도 동기화)에서 관리.

## 8. 알려진 제약 · 주의사항 (현재 상태 기록)

- 접근 제어가 클라이언트에만 있고 허용 UID가 하드코딩(§3).
- 검색(Algolia) 경로는 정렬을 프론트에서 처리하고 **페이지네이션이 없다**(§5).
- `ManageStore.getList`의 Firestore `searchText` 분기는 **도달 불가 dead code**(§5).
- 엑셀 일괄 등록은 등록 후 **목록을 자동 새로고침하지 않는다**(`addGearOnly`).
- 업로드 경로가 3가지(Storage 직접 / Cloud Run / Cloud Functions)로 혼재한다(§7).
- `weight`는 모델에선 `string`, 저장 시 `number`로 변환된다.
- `SearchInput`이 디바운스 타이머를 전역(`window`)에 저장한다.
- 크롤 파이프라인이 기록하는 `groupId`/`specs`는 **manage에서 표시·편집하지 않는다**(§4.3). 인라인 편집 시 보존되지만 운영자가 manage에서 볼 수는 없다.

> 위 항목들은 "현재 이렇게 동작한다"는 사실 기록이다. 개선/리팩토링이 필요하면 별도 이슈로 분리하고, 변경 시 이 문서를 함께 갱신한다.

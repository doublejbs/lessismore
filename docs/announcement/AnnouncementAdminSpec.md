# 공지 / 신기능 팝업 어드민 기능 스펙 (보관함 + 발행)

## 1. 개요

앱(`lessismore-app`)의 **인앱 공지 바텀시트**와 **신기능 안내 팝업**을 원격으로 제어하는 어드민 화면이다. 앱은 Firestore **라이브 단일 문서**만 실시간(`onSnapshot`) 구독하고, 어드민은 여기에 **보관함(초안·이력) + 발행** 모델을 얹는다.

- 같은 Firebase 프로젝트(`lessismore-7e070`)를 공유하므로, 라이브 문서 쓰기가 곧 앱 노출이다.
- 앱 쪽 동작 명세는 앱 레포 `specs/Announcement.md` 참고. 이 문서는 **어드민 화면**만 다룬다.
- 앱 쪽 계약(라이브 문서 스키마)은 **변경 금지**.

## 2. 라우트 / 접근 제어

- 라우트: **`/announcement`** (manage와 병렬, `App.tsx` `ROUTES`에 등록).
- 접근 제어는 `manage`와 **동일한 `ALLOWED_UIDS`**(`src/common/AllowedUids.ts`)를 공유한다.
  1. 비로그인 → Google 로그인 버튼만 표시.
  2. 로그인했지만 미허용 UID → "접근 권한이 없습니다."
  3. 허용 UID → 탭 화면 렌더 (각 탭의 데이터 로딩 중에는 Spin 표시).
- ⚠️ 접근 제어는 **클라이언트 사이드**다. 실제 쓰기 보호는 Firestore 보안 규칙(`config/*`, `announcements/*`, `feature-popups/*` 쓰기를 허용 UID로 제한)에 의존한다 — **레포 범위 밖(콘솔 작업)**.

## 3. 데이터 모델

### 3.1 라이브 문서 (앱 계약 — 변경 금지)

앱이 실시간 구독하는 단일 문서. 어드민의 "발행"이 이 문서를 덮어쓴다.

**`config/announcement`** — 텍스트 공지 바텀시트

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `id` | string | 공지 식별자. **바꾸면 새 공지**로 인식돼, 닫았던 사용자에게도 다시 뜬다 |
| `active` | boolean | 표시 on/off |
| `message` | string | 본문(필수) |
| `link` | string? | (선택) 이동 대상. 앱 내부 경로(`/bag`) 또는 `http(s)://` |
| `startAt` / `endAt` | string?(ISO) | (선택) 노출 기간 |

**`config/featurePopup`** — 신기능 안내 중앙 카드 팝업

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `id` | string | 팝업 식별자. **닫음이 id 단위 영구 저장**이라, id가 바뀌면 닫았던 사용자에게도 다시 뜬다 |
| `active` | boolean | 표시 on/off |
| `title` | string | 제목(필수, 줄바꿈 허용) |
| `subtitle` | string? | (선택) 보조 문구 |
| `items` | array? | (선택) 소개 항목. **앱은 앞 3개만 렌더**. 각 항목: `{ imageUrl?, title, description?, link? }` |
| `buttonLabel` | string? | (선택) 주 버튼 문구. 비면 앱 기본 '확인' |
| `buttonLink` | string? | (선택) 주 버튼 이동 대상 |
| `showSkip` | boolean? | (선택) 건너뛰기 노출. 기본 true |
| `startAt` / `endAt` | string?(ISO) | (선택) 노출 기간 |

### 3.2 보관함 컬렉션 (어드민 전용 — 앱은 읽지 않음)

문서 키 = 항목의 `id` 필드. 옵셔널 필드는 **값이 있을 때만 저장**(빈 문자열 저장 금지).

**`announcements/{id}`**

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `id`, `message`, `link?`, `startAt?`, `endAt?` | — | 라이브 문서와 동일 의미 (`active` 없음 — 발행이 노출을 결정) |
| `createdAt` | string(ISO) | 최초 저장 시각. **신규일 때만** 기록(같은 id로 재저장 시 유지) |
| `updatedAt` | string(ISO) | 저장할 때마다 갱신. 목록 정렬 기준 |

**`feature-popups/{id}`**

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `id`, `title`, `subtitle?`, `items?`, `buttonLabel?`, `buttonLink?`, `startAt?`, `endAt?` | — | 라이브 문서와 동일 의미 (`active` 없음) |
| `showSkip` | boolean | 폼 Switch 값을 **항상 저장**(기본 ON=true). 명시 저장으로 발행 시 모호함 제거 |
| `createdAt` / `updatedAt` | string(ISO) | announcements와 동일 규칙 |

## 4. 기능 명세

### 4.1 발행 모델

- **발행** = 선택한 보관함 항목의 **콘텐츠 필드**를 라이브 문서에 `active: true`와 함께 `setDoc`(전체 덮어쓰기). `createdAt`/`updatedAt`은 라이브 문서에 넣지 않는다.
- **끄기** = 라이브 문서의 `active`만 `false`로 저장(문서·나머지 필드 유지). `active`가 true일 때만 가능.
- **내리기(삭제)** = 라이브 문서 `deleteDoc`. confirm 후 실행. 보관함은 영향 없음.
- 보관함 항목 **삭제** = 보관함에서만 지움. **라이브 노출에 영향 없음**(confirm 문구에 명시).

### 4.2 UI 구조 (한 페이지, antd)

`AnnouncementAdminView.tsx`는 **셸**: 접근 제어 + 제목 + `Tabs` 2개.

1. **공지 탭** — `AnnouncementTabView.tsx`
2. **신기능 팝업 탭** — `FeaturePopupTabView.tsx`

각 탭 공통 구성(위→아래):

**라이브 상태 카드**
- 현재 라이브 문서를 `getDoc` 1회 조회(발행/끄기/내리기 후 상태 갱신).
- 표시: id, 본문(공지=message) / 제목(팝업=title) 요약, active 상태 Tag(ON/OFF), 기간.
- 액션: [끄기](active=false 저장, active일 때만 활성), [내리기](deleteDoc, confirm).
- 라이브 문서 없으면 "발행된 항목 없음".

**보관함 목록 (antd Table)**
- 컬럼: id · 요약(공지=message 앞부분 / 팝업=title) · 기간(startAt~endAt, 없으면 '-') · 수정일(updatedAt) · 액션([발행] [편집] [삭제]).
- `updatedAt` 내림차순(`query` + `orderBy('updatedAt', 'desc')`).
- 라이브 문서와 id가 같은 행에 'LIVE' Tag.
- 상단 [새로 만들기] 버튼.

**작성/편집 폼 (antd Modal + Form)**
- 공지 폼: `id`(필수) · `message`(필수, TextArea) · `link`(선택) · `startAt`/`endAt`(DatePicker showTime, 선택). ~~active 스위치~~ 제거 — **발행이 노출을 결정**.
- 팝업 폼: `id`(필수) · `title`(필수, TextArea 2줄 — 줄바꿈 허용) · `subtitle`(선택) · **`items`: `Form.List`(최대 3개)** — 각 항목 imageUrl(선택)/title(필수)/description(선택)/link(선택), 항목 추가·삭제 버튼(3개 도달 시 추가 버튼 숨김) · `buttonLabel`(선택, 비면 앱 기본 '확인' 안내) · `buttonLink`(선택) · `showSkip`(Switch, 기본 ON) · `startAt`/`endAt`(선택).
- 저장 → 보관함 컬렉션에 `setDoc`(문서 키 = id, `createdAt`은 신규일 때만, `updatedAt` 항상 갱신) 후 목록 갱신.
- **편집 중 id 변경** = 새 항목으로 저장됨(기존 항목은 남음)을 폼 extra로 안내. 바뀐 id가 기존 다른 항목과 같으면 그 항목을 덮어쓴다(createdAt은 그 항목 것 유지).

**앱 화면 미리보기 (작성/편집 Modal 내)**
- 두 탭의 작성/편집 Modal은 **좌측 폼 + 우측 미리보기**의 좌우 배치다(공지 width 840 / 팝업 960, flex row + `flexWrap: 'wrap'`으로 좁은 화면에서 세로 낙하).
- 미리보기는 고정 크기 **폰 프레임**(약 320×640, 라운드 16, 테두리 `#E5E5E5`) 안에 앱 화면 위 딤(`rgba(0,0,0,0.5)`)이 깔린 모습을 렌더하고, 프레임 밖 상단에 "앱 미리보기" 캡션을 둔다.
  - 공지: 프레임 **하단 앵커 바텀 시트** 재현 — 그랩 핸들 · 본문(줄바꿈 유지, 비면 플레이스홀더) · link 입력 시 "자세히 보기" 밑줄 텍스트 · [닫기]/[하루동안 보지않기] 버튼 행.
  - 팝업: 프레임 **중앙 카드** 재현 — 제목(줄바꿈 유지, 비면 플레이스홀더) · 부제목 · 소개 항목 리스트(제목이 입력된 항목만, 썸네일 이미지 로드 실패 시 회색 박스 폴백, link 있으면 chevron) · 메인 버튼(buttonLabel 비면 '확인') · showSkip ON일 때 "건너뛰기".
- **실시간 갱신**: `Form.useWatch`로 관련 필드(공지 message/link, 팝업 title/subtitle/items/buttonLabel/showSkip)를 구독해 입력 즉시 미리보기에 반영한다. `useWatch`는 Modal이 닫혀 있어도 안전하다.
- 미리보기는 **앱 원본 대비 비율 축소 재현**이다(폰 프레임이 실제 기기보다 작아 수치를 축소·근사). 픽셀 정합 목적이 아니라 구성·문안 확인 목적. 폰트는 웹 레포에 이미 로드된 Pretendard(+시스템 폴백)를 쓴다.
- 미리보기 컴포넌트는 순수 프레젠테이션(FC, 상태는 이미지 onError 폴백 정도만)이다.

**발행 confirm**
- "이 항목을 라이브로 발행할까요?"
- 라이브 문서와 다른 id를 발행하면 "닫았던 사용자에게도 새로 노출됩니다" 안내. **팝업 탭은 특히 강조**(닫음이 id 단위 영구 저장).
- 발행 성공 시 `message.success` + 라이브 카드 갱신.

### 4.3 날짜 처리

- 폼은 dayjs, 저장은 ISO 문자열. 변환·표시는 `AdminDateUtil.ts`(`toIsoString` / `toDayjs` / `formatDateTime` / `formatPeriod`)로 통일.

## 5. 파일 구성

| 파일 | 역할 |
| --- | --- |
| `src/announcement/AnnouncementAdminView.tsx` | 셸(접근 제어 + Tabs) |
| `src/announcement/AnnouncementTabView.tsx` | 공지 탭(라이브 카드 + 보관함 목록 + 폼 + 발행) |
| `src/announcement/FeaturePopupTabView.tsx` | 신기능 팝업 탭(동일 구성 + items Form.List) |
| `src/announcement/AdminDateUtil.ts` | ISO ↔ dayjs 변환·표시 유틸 |
| `src/announcement/AnnouncementPreview.tsx` | 공지 바텀 시트 미리보기(폰 프레임, 순수 프레젠테이션) |
| `src/announcement/FeaturePopupPreview.tsx` | 신기능 팝업 미리보기(폰 프레임, 순수 프레젠테이션) |

두 탭의 스키마가 달라 라이브 로드/발행/목록 로드 로직은 **각 탭에 단순 중복**을 허용한다(억지 공용화 금지). 공용은 날짜 유틸 수준만.

## 6. 검증 / 리뷰

- `npm run lint`, `npm run build`(`tsc -b && vite build`) 통과.
- 스펙 컴플라이언스 + 코드 품질 2단계 리뷰.

## 7. 범위 밖 / 미해결

- Firestore 보안 규칙 배포: 콘솔 작업(레포 밖). 이 화면은 UI 게이팅만.
- 이미지 업로드(팝업 items의 imageUrl): URL 직접 입력만 지원. 업로드 연동은 후순위.
- 예약 발행(특정 시각 자동 발행): `startAt`/`endAt`으로 노출 기간만 제어. 발행 자체는 수동.

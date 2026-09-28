# 그룹 초대 웹 랜딩 스펙 (`/group/:id`)

| 항목 | 내용 |
| --- | --- |
| 상태 | 구현 (2026-09-17) |
| 원 스펙 | 앱 레포 `lessismore-app` `group/specs/Group.md` GRP-3, `group/specs/DataModel.md` DM-29 |
| 코드 | `src/group-invite/`, 라우트 등록 `src/App.tsx` |

> 이 문서는 **웹 랜딩 쪽 계약**만 적는다. 그룹 도메인의 단일 진실 공급원은 앱 레포의 GRP-3 · DM-29이며, 이 레포는 그 계약을 따르는 랜딩 한 장만 갖는다.

## 1. 목적

앱은 Universal Links / App Links를 쓰지 않는다(GRP-3). 따라서 초대 링크
`https://lessismore-7e070.web.app/group/{groupId}` 는 브라우저로 열리고,
**웹 랜딩이 앱 스킴을 여는 것이 앱으로 들어가는 유일한 경로**다.
장비 공유(`/gear-share/:id`, GD-7)·박지 공유(`/camp-share/:id`, CS-7) 랜딩과 같은 구조다.

## 2. 라우트와 링크 계약

- 경로: `/group/:id`. 앱의 `constants/WebLinks.ts` `getGroupInviteUrl()`이 만드는 형태와 1:1이다
  (`${WEB_BASE_URL}/group/${encodeURIComponent(groupId)}`).
- `react-router-dom`의 `useParams()`가 이미 디코딩해 주므로 모델에는 **원본 groupId**가 들어간다.
- Firebase Hosting은 `firebase.json`의 `"source": "**" → "/index.html"` 리라이트로 SPA 폴백을 이미 갖고 있다. 호스팅 설정 변경은 필요 없다.

## 3. 초대 요약 읽기

- `groupInvites/{groupId}` 문서 **1건만** `getDoc` 한다(DM-29 「초대 공개 요약」).
- **그룹 문서 `groups/{groupId}`는 읽지 않는다.** 그룹 보안 규칙이 그룹 문서 읽기에 로그인을 요구하는데(GRP-3·DM-29) 이 랜딩은 비인증이다. 대신 서버가 초대 화면에 필요한 값만 복제해 둔 공개 미러를 읽는다.
- 표시 필드: `name`, `startDate`/`endDate`, `destinationName`, `memberCount`, `inviteEnabled`.
  `updatedAt`도 미러에 있지만 갱신 시각이라 화면에서 쓰지 않는다.
- **미러에 없는 값을 화면이 쓰지 않는다.** `meetingNote`·`memberIds`·`ownerId`는 복제되지 않는다 —
  링크는 전달될 수 있고 집합 메모는 일행이 실제로 언제 어디서 모이는지를 담기 때문이다(DM-29).
- **하위 컬렉션(`members`·`bags`·`points`·`routes`)은 읽지 않는다.** 비멤버에게 열려 있지 않다.
- **쓰기를 하지 않는다.** 규칙이 `groupInvites` 쓰기를 전면 금지한다 — 미러는 `groups/{groupId}` 쓰기 트리거만 만들고 갱신하고 지운다.

### 인증 상태

- 이 웹 앱은 **익명 인증을 쓰지 않는다.** `Firebase.initialize()`는 `authStateReady()`만 기다리고, 로그인 세션이 있을 때만 `users/{uid}`를 만든다. 즉 초대 링크를 여는 일반 방문자는 **비인증 상태**로 Firestore를 읽는다.
- `groupInvites/{groupId}`의 규칙은 `allow get: if true`라 **비인증 읽기가 정상 동작**이다. `list`는 막혀 있지만 랜딩은 문서 1건을 `get` 할 뿐이라 영향이 없다.
- (익명 로그인으로 우회하지 않는 이유: 이 레포의 `Firebase.onAuthStateChanged` → `checkLoggedIn()` → `initializeStore()`가 `users/{uid}` 문서를 **쓰기** 때문에, 읽기 전용 랜딩이 계정 문서를 양산하게 된다.)

### 미러의 결과적 일관성

- 미러는 서버 트리거가 유지하므로 **결과적 일관성**이다(DM-29). 그룹을 만든 직후 아주 잠깐, 그리고 **트리거가 아직 배포되지 않은 동안**에는 문서가 없다.
- 그래서 **문서 없음을 `사라진 그룹`으로 단정하지 않는다.** 해산된 그룹과 아직 만들어지지 않은 미러를 랜딩은 구분할 수 없는데, 방금 만든 그룹의 초대 링크가 "사라진 그룹"이라고 말하는 쪽이 훨씬 나쁘다. 두 경우 모두 아래 축소 형태로 떨어진다.
- 즉 **서버 트리거가 배포되기 전에도 이 화면은 깨지지 않는다.** 모든 초대 링크가 축소 형태(앱에서 열기 + 설치 안내)로 동작한다.

## 4. 상태별 표시

| 상태 | 판정 | 표시 |
| --- | --- | --- |
| 로딩 | 초기 | `불러오는 중…` |
| 정상 | 미러 문서 존재 | 이름 · 기간 · 여행지 · `멤버 N명` + `앱에서 열기` |
| 정원 초과 | `memberCount >= 20` | `정원이 찼어요` 안내 + **버튼 유지** (참여 거절은 앱이 판단한다) |
| 초대 마감 | `inviteEnabled === false` | `초대가 마감됐어요` 안내 + 버튼 유지 |
| 축소 형태 | 미러 문서 없음(`!snapshot.exists()`) **또는** 읽기 실패(예외) | 그룹 정보 없이 `앱에서 열기` + 설치 안내만 |
| 잘못된 링크 | URL에 `groupId`가 없다 | `잘못된 초대 링크예요` + useless 홈 링크 |

- 초대 마감과 정원 초과가 동시에 성립하면 **초대 마감**을 표시한다(방장이 명시적으로 잠근 쪽이 더 구체적인 사유다).
- 기간은 `YYYY.MM.DD ~ YYYY.MM.DD`로 표시하고, 시작일과 종료일이 같으면 한 날짜만 표시한다.
- **미러를 못 읽는 것이 링크 전체를 죽이지 않는다**는 것이 이 표의 핵심이다. 초대 요약은 부가 정보이고, 앱으로 넘기는 것이 링크의 본래 목적이다.
- 축소 형태로 떨어지는 사유(문서 없음 / 권한 거부 / 네트워크)를 **화면에서 구분하지 않는다.** 방문자가 할 수 있는 일은 어느 쪽이든 앱을 여는 것뿐이다.
- 반대로 `groupId`가 아예 없는 링크는 앱으로 넘길 대상 자체가 없으므로 축소 형태가 아니라 잘못된 링크로 처리한다.

## 5. 앱으로 넘기기

- 주 액션 `앱에서 열기` → `lessismoreapp://group/join?groupId={encodeURIComponent(groupId)}`.
  앱의 참여 화면(`app/group/join.tsx`)은 동적 세그먼트가 없어 **쿼리 `groupId`** 로 받는다(GRP-3).
- 폴백은 `gear-share`·`camp-share`와 **같은 방식**이다: 스킴 이동 후 1.5초 타이머, `visibilitychange`로 페이지가 숨겨지면(=앱이 열렸으면) 타이머 취소, 그렇지 않으면 스토어로 이동.
  이 로직은 `src/utils/AppSchemeLink.ts`로 뽑아 재사용한다.
- 데스크톱(iOS·Android가 아닌 UA)에서는 스킴을 호출하지 않고 바로 스토어로 보낸다(`gear-share`와 동일).

# 그룹 초대 웹 랜딩 스펙 (`/group/:id`)

| 항목 | 내용 |
| --- | --- |
| 상태 | 구현 (2026-09-17) |
| 원 스펙 | 앱 레포 `lessismore-app` `group/specs/Group.md` GRP-3, `group/specs/DataModel.md` DM-29 |
| 코드 | `src/group-invite/`, 라우트 등록 `src/App.tsx`, 미리보기 태그 함수 `functions/groupInviteHtml.js`(§7) |

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
- Firebase Hosting은 `firebase.json`의 `"source": "**" → "/index.html"` 리라이트로 SPA 폴백을 갖고 있다. `/group/**`만 그 앞의 리라이트로 함수 `groupInviteHtml`에 보낸다(§7) — 함수가 같은 `index.html`에 태그만 바꿔 돌려주므로 브라우저에서 보이는 랜딩은 같다.
  빌드 산출물의 정적 경로는 모두 절대 경로(`/assets/…`, `/manifest.json` 등, Vite `base` 기본값 `/`)라 `/group/{id}` 아래에서 서빙돼도 JS·CSS가 그대로 로드된다.

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

## 7. 링크 미리보기(OG 태그) `[구현 2026-09-29 · 미배포]`

초대 링크를 카카오톡·메시지·SNS에 붙이면 **그룹 이름과 일정이 미리보기에 보여야 한다.** 미리보기 크롤러(카카오 스크랩, 페이스북, 애플 메시지 등)는 자바스크립트를 실행하지 않으므로, 브라우저에서 태그를 바꾸는 방식으로는 안 된다 — **서버가 태그를 채운 HTML을 돌려준다.**

- **경로**: `firebase.json` hosting rewrite에서 `/group/**`만 HTTPS 함수 `groupInviteHtml`(asia-northeast3)로 보낸다. 나머지 경로의 `** → /index.html` 폴백은 그대로다(더 구체적인 rewrite를 먼저 둔다).
- **함수 동작**
  1. 경로에서 `groupId`를 꺼낸다(`/group/{id}`, 쿼리·끝 슬래시 무시). 없으면 기본 HTML.
  2. Admin SDK로 `groupInvites/{groupId}` **1건만** 읽는다(§3과 같은 공개 미러 — 미러에 없는 값은 쓰지 않는다).
  3. 배포된 `index.html`(호스팅의 정적 파일, `https://lessismore-7e070.web.app/index.html`)을 가져와(인스턴스 메모리에 5분 캐시) `<head>`의 OG·트위터 태그와 `<title>`만 바꿔 돌려준다. 본문과 스크립트는 그대로라 **브라우저에서는 지금 랜딩이 그대로 뜬다.**
  4. 응답 헤더 `Cache-Control: public, max-age=300, s-maxage=600`(그룹 이름이 바뀌어도 오래 묵지 않게).
- **태그 값**
  | 태그 | 정상 | 초대 마감(`inviteEnabled === false`) | 미러 없음·읽기 실패·잘못된 링크 |
  | --- | --- | --- | --- |
  | `og:title` / `<title>` | `{name} 그룹에 초대받았어요` | `{name}` | `useless 그룹 초대` |
  | `og:description` | `{기간} · {여행지} · 멤버 {N}명 — useless에서 함께 준비해요` (없는 값은 조각째 뺀다) | `초대가 마감된 그룹이에요` | `useless 앱에서 그룹에 참여하세요` |
  | `og:url` | `https://lessismore-7e070.web.app/group/{groupId}` | 같음 | 요청 URL |
  | `og:image` | 기존 `https://lessismore-7e070.web.app/logo.JPG`(944×734) | 같음 | 같음 |
  - 기간 형식은 §4와 같다(`YYYY.MM.DD ~ YYYY.MM.DD`, 같은 날이면 하나). 여행지는 `destinationName`.
  - 트위터 태그(`twitter:title`·`twitter:description`·`twitter:url`)도 같은 값으로 맞춘다. `og:type=website`, `og:site_name=USELESS`는 유지.
  - 모든 값은 **HTML 이스케이프**한다(그룹 이름은 사용자 입력).
- **실패해도 링크가 죽지 않는다**: 함수 오류·타임아웃 시 기본 태그의 `index.html`을 돌려준다(§3의 "초대 요약은 부가 정보" 원칙). `index.html`을 가져오지 못하면 302로 `/index.html`에 넘기지 않는다(루프 위험) — 최소 HTML(태그 + `/` 스크립트 로드 없이 앱 스킴 안내 링크)로 응답한다.
- **구현**: `functions/groupInviteHtml.js`의 `groupInviteHtml`(`onRequest`, asia-northeast3, maxInstances 10), `functions/index.js`에서 export. 순수 함수 `parseGroupId`·`buildGroupInviteMeta`·`injectMeta`·`buildMinimalHtml`로 나뉜다.
  - 태그 교체는 `<meta property|name="…" content="…">`를 속성 순서·따옴표와 무관하게 잡아 바꾸고, 없으면 `</head>` 앞에 넣는다.
  - Firestore 읽기·템플릿 가져오기는 각각 3초 제한. 템플릿 가져오기에 실패하면 5분이 지난 묵은 캐시라도 있으면 그것을 쓰고, 없을 때만 최소 HTML(앱 스킴 `useless 앱에서 열기` + App Store·Google Play 링크)을 돌려준다.
  - 이름이 빈 미러는 제목을 기본값(`useless 그룹 초대`)으로, 기간·여행지·인원이 모두 없으면 설명을 기본값으로 둔다.
  - `GET`·`HEAD`만 받는다(그 외 405).
- **카카오 캐시**: 카카오는 스크랩 결과를 캐시한다. 배포 직후 이미 공유된 링크는 카카오 디벨로퍼스 [공유 디버거](https://developers.kakao.com/tool/debugger/sharing)에서 캐시를 지워야 새 미리보기가 나온다.
- **개인정보**: 미리보기는 §3의 공개 미러 값(이름·기간·여행지·인원)만 쓴다. `meetingNote`·멤버 이름은 싣지 않는다.

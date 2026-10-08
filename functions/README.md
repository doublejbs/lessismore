# 커뮤니티·그룹 Cloud Functions

커뮤니티 게시글·댓글·반응·멘션·공개 사진과 그룹(여행 1건)의 후속 정리를 담당하는 Firebase Cloud Functions다. Firebase 프로젝트 `lessismore-7e070`, 기본 Storage 버킷, 리전 `asia-northeast3`를 사용한다. 기존 `naverShoppingSearch`와 `uploadImageFromUrl` 함수는 이 모듈과 독립적으로 유지한다.

## 커뮤니티 함수와 트리거

- `onCommunityPostStatusChanged`: `community-posts/{postId}` 문서가 `published`에서 `hidden`으로 바뀌거나 `deleted`가 아닌 상태에서 `deleted`로 바뀔 때 실행한다. `deleted`는 댓글·좋아요·투표를 400개 단위 배치로 삭제하고 제목·본문·사진·배낭 스냅샷·투표·작성자 닉네임·카운트를 툼스톤 값으로 정리한다. 툼스톤의 `authorId`는 보존하고 닉네임만 제거한다. `hidden`은 운영 검토·해제가 가능하므로 댓글·좋아요·투표와 카운트를 유지하고 `community/{authorId}/{postId}/` 사진과 `images`만 정리한다. `hidden` 뒤 `deleted`로 바뀌면 삭제 정리를 별도로 수행한다.
- `onCommunityCommentHidden`: 댓글이 `published`에서 `hidden`으로 바뀔 때 부모 게시글 `commentCount`를 트랜잭션으로 0 미만이 되지 않도록 보정한다. 댓글 문서의 보정 표식을 함께 기록해 이벤트 재시도 시 중복 차감을 막는다. `deleted` 전환은 클라이언트가 카운트를 보정하므로 건드리지 않는다.
- `onCommunityUserDeleted`: Firebase Auth 사용자 삭제(v1 Auth 트리거) 뒤 작성 게시글을 `deleted`로 전환하고, 작성 댓글·좋아요·투표를 트랜잭션과 400개 단위 배치로 정리한다. 답글이 남은 댓글은 `status: "deleted"`, `deletedReason: "withdrawal"` 자리표시로 바꾸며 `authorId`는 유지하고 `authorName`·본문·멘션 식별자는 제거한다. 탈퇴자의 멘션을 참조하는 모든 댓글은 `mentionedUserName`을 빈 값으로 만들고 `mentionedUserId`를 삭제한다. `community/{uid}/` Storage 사진을 삭제하며 `community-reports`와 그 안의 `reporterId`는 운영 기록으로 보존한다.
- `cleanupOrphanCommunityImages`: 24시간마다 `community/` Storage를 검사한다. 파일을 게시글 ID별로 묶어 게시글 문서를 한 번씩만 읽고, 게시글이 없거나 `deleted`·`hidden`이거나 `images[].storagePath`에 없는 파일을 삭제한다. `timeCreated`가 최근 24시간 이내인 업로드는 작성 중일 수 있으므로 건너뛴다.
- `pruneCommunityCommentPlaceholders`: 매일 `status == "deleted"` 댓글을 400개 단위로 검사한다. 최상위 댓글은 `parentId` 답글이 하나도 없을 때 삭제하고, 답글이 남아 있으면 유지한다. `parentId`가 있는 삭제 답글 자리표시는 답글 대상이 없으므로 삭제한다. 삭제된 문서가 이미 없거나 재시도되어도 같은 결과가 되도록 멱등적으로 동작한다.

## 삭제 정책과 알려진 한계

- 앱은 댓글 삭제를 항상 소프트 삭제(`status: "deleted"`, `deletedReason: "author"`)로 기록한다. `pruneCommunityCommentPlaceholders`가 답글이 없는 자리표시를 나중에 물리 삭제하고, 답글이 있는 최상위 자리표시는 답글이 남아 있는 동안 유지한다.
- 게시글·댓글 툼스톤은 `authorId`를 유지하고 작성자 닉네임·본문 등 표시 정보를 제거한다. 신고 기록은 운영 감사 목적상 삭제하지 않으며 `reporterId`도 보존한다.
- 탈퇴자 좋아요·투표는 게시글이 `published` 또는 `hidden`일 때 카운트를 보정한다. 투표 문서는 `optionIds`(string 배열, 앱 DM-28 2026-09-05 개정)를 기준으로 **배열의 각 선택지 `voteCount`를 1씩 내리고 `totalVoteCount`는 참여자 1명분인 1만 내린다**(복수 선택 투표에서 선택지가 여럿이어도 총 참여 수는 1). 마이그레이션 전 레거시 문서의 `optionId`(string)도 원소 하나짜리 배열로 읽어 호환한다. `poll.options`에 없는 투표 ID는 무시하고 배열의 중복 원소는 한 번만 차감한다. 두 필드가 모두 없거나 `optionIds`가 빈 배열(또는 문자열 원소 없음)이면 투표 문서만 삭제하고 카운트는 건드리지 않는다. 카운터 근거는 트랜잭션 안에서 다시 읽은 투표 문서다(2026-09-10). `hidden` 해제 시 댓글 `commentCount` 재증가는 미구현(알려진 한계)이다.

## 커뮤니티 멱등성·재시도

Firestore 삭제는 대상이 이미 없으면 다음 실행에서 남은 대상만 처리한다. 게시글 정리는 상태별 완료 표식인 `hiddenCleanedAt`과 `deletedCleanedAt`을 사용한다. 따라서 `hidden` 정리가 끝난 뒤 `deleted`로 바뀌어도 삭제 정리가 실행되며, 각 단계가 실패한 뒤 재실행되어도 완료된 단계는 반복하지 않는다. 댓글 숨김·탈퇴 처리는 트랜잭션 안에서 현재 문서와 카운트를 함께 확인한다. 게시글 상태 변경과 Auth 삭제는 재시도 옵션을 켜고, 두 스케줄 함수도 최대 3회 재시도하도록 설정하며, Storage 삭제는 `ignoreNotFound: true`를 사용한다.

## 커뮤니티 인덱스

서버 전용 컬렉션 그룹 인덱스는 다음 3개다.

- `comments` / `authorId ASCENDING`: 탈퇴 작성 댓글 조회
- `comments` / `status ASCENDING`: 삭제 댓글 자리표시 정리
- `comments` / `mentionedUserId ASCENDING`: 탈퇴자 멘션 참조 정리

이 목록은 [community.indexes.json](community.indexes.json)에 기록했지만, 앱 레포의 `docs/firebase/community-firestore.indexes.json`이 Firestore 인덱스를 배포하는 단일 파일이다. 앱 레포의 게시글 2개·댓글 1개·신고 1개 인덱스 목록에 위 서버 전용 인덱스도 병합해 달라고 요청한 뒤, 그 단일 파일을 배포한다. 단일 필드 인덱스가 이미 자동 생성된 프로젝트에서도 컬렉션 그룹 쿼리용 서버 인덱스는 배포 전에 확인한다.

```bash
firebase deploy --only firestore:indexes
```

## 그룹 함수와 트리거

그룹 정리는 [group.js](group.js)에 따로 두고 커뮤니티 모듈과 섞지 않는다. `groups/{groupId}` 경로에는 생성·수정·삭제 트리거를 **이벤트당 하나씩** 붙여 같은 쓰기가 두 함수에서 중복 처리되지 않게 한다.

- `onGroupCreated`: `groups/{groupId}` 생성 시 초대 공개 요약 `groupInvites/{groupId}`를 만든다.
- `onGroupUpdated`: `groups/{groupId}` 수정 시 세 가지를 한 번에 처리한다. ① `memberIds`에서 빠진 uid의 멤버 문서·배낭 스냅샷·역인덱스를 지운다. ② 멤버 구성이나 이름·기간·여행지·방장이 바뀌었으면 **남아 있는 멤버 전원**의 역인덱스 `users/{uid}/groups/{groupId}` 요약을 다시 쓴다 — 클라이언트는 본인 문서만 쓸 수 있어 다른 멤버의 목록 행이 낡은 인원수로 굳기 때문이다(DM-29 서버 작업). 역인덱스는 `update` 쓰기라 본인 소유 값(`hasBag`·`bagId`·`joinedAt`)을 건드리지 않고, 없는 문서를 만들지도 않는다(문서 생성은 참여한 본인 몫이다). ③ 초대 요약을 그룹 문서에 맞춘다.

  **판단 근거를 이벤트 스냅샷이 아니라 현재 문서에서 가져온다.** 트리거 전달은 at-least-once 이고 순서를 보장하지 않아, 실패한 옛 이벤트가 한참 뒤 재배달될 수 있다. 빠진 uid를 이벤트 차분만으로 정하면 "나갔다가 곧바로 재참여한 멤버"의 문서를 뒤늦게 지워 `memberIds`와 `members` 하위 문서가 어긋난다(DM-29 불변식). 그래서 핸들러는 먼저 그룹 문서를 다시 읽는다. 문서가 이미 없으면(해산됨) 요약 동기화와 미러 쓰기는 건너뛰되 **①의 빠진 멤버 정리는 그대로 수행한다** — 전부 삭제라 되살릴 위험이 없고, 내보내기 직후 해산이 이어지면 `onGroupDeleted`는 그 uid를 알 방법이 없어(삭제 스냅샷의 `memberIds`와 `members` 하위 문서 양쪽에서 이미 빠져 있다) 강퇴당한 사람의 목록에 해산된 그룹이 유령으로 남는다.
- `onGroupDeleted`: 그룹 해산(하드 삭제) 시 **초대 요약을 가장 먼저** 지운다 — 뒤 단계가 실패해 재시도를 기다리는 동안 해산된 그룹의 이름·기간이 비인증 랜딩에 계속 노출되면 안 되기 때문이다. 이어서 멤버 전원의 역인덱스를 지우고(이게 빠지면 남은 멤버의 목록에 해산된 그룹이 유령으로 남는다), 하위 컬렉션 `members`·`bags`·`points`·`routes`를 400개 단위 배치로 전량 지우면서 Storage `groups/{groupId}/routes/` 접두 파일을 함께 지운다. 멤버 uid는 삭제 직전 스냅샷의 `memberIds`와 `members` 하위 문서 ID를 합쳐 모으므로 한쪽이 이미 비어도 유실되지 않는다.
- `onGroupUserDeleted`: Firebase Auth 사용자 삭제(v1 Auth 트리거). 탈퇴자가 올린 포인트·코스의 `authorName`을 먼저 비우고(문서는 남긴다 — 화면이 `(탈퇴한 사용자)`로 그린다), 그 뒤 `memberIds array-contains` 로 소속 그룹을 훑어 **방장인 그룹은 문서를 지워 해산**하고(하위 정리는 `onGroupDeleted`가 연쇄로 맡는다) 나머지 그룹에서는 트랜잭션으로 `memberIds`·`memberCount`를 줄이고 멤버 문서·배낭 스냅샷·역인덱스를 지운다. 마지막으로 `users/{uid}/groups` 에 남은 역인덱스를 쓸어 담는다. 해산은 되돌릴 수 없으므로 사라진 `groupId` 목록을 로그에 남긴다.

커뮤니티 탈퇴 정리(`onCommunityUserDeleted`)와 **합치지 않고 별도 Auth 트리거로 둔다.** 두 도메인의 데이터가 서로 겹치지 않아 실행 순서가 상관없고, 나누면 실패·재시도가 도메인별로 격리되며 `--only functions:onGroupUserDeleted` 로 따로 배포·롤백할 수 있다. 계정 삭제는 사용자당 한 번뿐이라 트리거가 하나 늘어나는 호출 비용은 무시할 수 있다.

### 초대 공개 요약 `groupInvites/{groupId}`

비인증 웹 랜딩이 읽는 유일한 공개 문서이므로 **일곱 필드만 명시로 골라 복제한다**: `name`·`startDate`·`endDate`·`destinationName?`·`memberCount`·`inviteEnabled`·`updatedAt`. 원본 문서를 스프레드하지 않는다. `meetingNote`·`memberIds`·`ownerId`·`campSpotId`·`pointCount`·`routeCount`는 복제 대상이 아니다 — 집합 메모는 일행이 실제로 언제 어디서 모이는지를 담는데 초대 링크는 전달될 수 있다. 미러는 부분 갱신이 아니라 문서 통째 `set`이라 선택 필드가 원본에서 빠지면 미러에서도 사라진다. 클라이언트 쓰기는 보안 규칙에서 막고(`allow write: if false`) admin SDK로만 쓴다.

미러 쓰기는 **트랜잭션 안에서 그룹 문서와 미러를 함께 읽고** 수행한다. 그룹이 이미 없으면 쓰지 않아 해산된 그룹의 공개 문서가 되살아나지 않고, 저장된 미러와 값이 같으면 건너뛰어 무의미한 공개 문서 쓰기를 막는다. 값 비교는 정규화한 뒤 하므로(`inviteEnabled` 미설정 → `true`) 실질적으로 같은 값에는 쓰기가 발생하지 않는다. 같은 경로가 `onGroupCreated`와 `onGroupUpdated` 양쪽에서 쓰이므로, 생성 시 미러가 한 번 실패해도 다음 수정에서 스스로 복구된다. 수정 트리거는 이벤트의 before/after에서 미러 여섯 값이 모두 같으면 트랜잭션 자체를 걸지 않는다 — 포인트·코스 추가처럼 `pointCount`·`routeCount`만 바뀌는 그룹 문서 쓰기마다 읽기 잠금이 잡히면 참여 트랜잭션과 불필요하게 경합하기 때문이다.

### 그룹 멱등성·재시도

그룹 해산은 하드 삭제로 확정되어 그룹 문서에 `*CleanedAt` 가드를 쓸 자리가 없다(DM-29 갱신분). 대신 모든 정리 작업을 재실행해도 같은 결과가 되게 짠다 — 하위 문서 삭제는 본래 멱등이고, Storage 삭제는 `ignoreNotFound: true`다. **함수 사이의 순서까지 멱등해야 한다는 점이 그룹의 어려운 부분이다.** 수정 이벤트가 해산 뒤에 재배달되어도 지워진 문서를 되살리면 안 되므로, 역인덱스는 `update`(없으면 건너뜀)로 쓰고 초대 요약은 트랜잭션 안에서 그룹 문서 존재를 확인한 뒤에만 쓴다. `onGroupUpdated`도 이벤트 스냅샷이 아니라 다시 읽은 그룹 문서를 근거로 판단한다. 탈퇴자 `authorName` 비우기는 조건 필드(`authorId`)가 그대로 남아 같은 페이지를 다시 읽게 되므로 **커서(`startAfter`) 페이지네이션**으로 훑고, 이미 빈 값은 다시 쓰지 않는다. 배치는 400건을 넘지 않으며(Firestore 한도 500), 배치 도중 대상 문서가 사라지면 문서별로 다시 시도해 `NOT_FOUND`만 건너뛴다.

### 그룹 인덱스

탈퇴 정리에 컬렉션 그룹 인덱스 2개가 필요하다. `collectionGroup`은 DB 전체에서 같은 이름의 컬렉션을 잡으므로, 조회 결과는 `groups/{groupId}/` 하위인지 경로로 한 번 더 걸러 쓴다. [group.indexes.json](group.indexes.json)에 기록했고, 커뮤니티와 같은 방식으로 앱 레포의 단일 인덱스 파일에 병합해 **함수 배포 전에 먼저 배포**한다.

- `points` / `authorId ASCENDING` (COLLECTION_GROUP): 탈퇴자가 올린 포인트 조회
- `routes` / `authorId ASCENDING` (COLLECTION_GROUP): 탈퇴자가 올린 코스 조회

`groups` 의 `memberIds array-contains` 와 `users/{uid}/groups` 정렬은 단일 필드 자동 인덱스로 충분해 별도 선언이 없다.

## 추천 박지 주간 교체 `rotateFeedContent`

앱 홈 `useless가 고른 박지`(앱 레포 `specs/Home.md` HM-11 "주간 교체", 데이터 계약은 `specs/DataModel.md` DM-27 "주간 자동 교체")를 매주 자동으로 바꾸는 스케줄 함수다. 코드는 [feedRotation.js](feedRotation.js)에 있다.

- **주기**: `every thursday 07:00`, `timeZone: Asia/Seoul`(매주 목요일 07:00 KST). 리전 `asia-northeast3`, `maxInstances: 1`, `retryCount: 3`.
- **한 회차**: `feed-content`에서 `rotationState == "queued"`인 `spot_intro`를 `queueOrder` 오름차순(같으면 문서 ID)으로 세워 **앞 2건을 발행**한다 — `published: true`, `rotationState: "live"`, `publishedAt`(ISO string, 실행 시각, 두 번째 건은 1초 이른 값). 이어 `published == true`인 `spot_intro`를 `publishedAt` 내림차순으로 세워 **최신 5건 밖은 내린다** — `published: false`, `rotationState: "retired"`, `retiredAt`. `rotationState`가 없는 수동 발행분도 내림 대상이고, `gear_intro`는 건드리지 않는다.
- **대기열이 비면** 발행·내림 없이 `logger.warn`과 실행 기록(`status: "queue_empty"`)만 남긴다.
- **멱등성**: 실행 시각(`event.scheduleTime`, 재시도도 같은 값)을 KST 기준 ISO 주 ID(`2026-W42`)로 바꿔 `config/feedRotation.lastRunWeekId`와 비교한다. 이미 처리한 주면 아무것도 쓰지 않는다. 가드 확인·조회·발행·내림·`config/feedRotation`·`feed-rotation-runs/{weekId}` 기록이 **한 트랜잭션**이라 중간 실패 시 전부 롤백되고 재시도가 처음부터 다시 판단한다.
- **실행 기록**: `feed-rotation-runs/{weekId}`에 `weekId`·`ranAt`·`status`·`publishedIds`·`retiredIds`·`queueRemaining`. `config/feedRotation.queueRemaining`이 **4 미만이면 대기열을 보충**한다(HM-11 운영 노트).
- **인덱스**: 단일 필드 equality 조회 두 개(`rotationState`, `published`)뿐이고 정렬은 코드에서 해 복합 인덱스가 필요 없다.
- **대기열 적재**: 레포 루트 [scripts/queue-feed-content.mjs](../scripts/queue-feed-content.mjs). DRY-RUN이 기본이고 `--apply`에서만 쓴다. firebase-tools 로그인(소유자) OAuth 토큰 + Firestore REST로 쓰며, 쓰기 전에 `feed-content` 전체를 `scripts/backups/`(gitignore)에 백업한다. 문서 ID는 `rot-{relatedSpotId}`이고 이미 있는 ID는 덮어쓰지 않는다. 이미 `feed-content`에 있는 박지·비활성 `camp-spot`은 건너뛴다. `pool.json`의 `_review` 등 다른 키는 적재하지 않는다.

```bash
# 대기열 적재 (레포 루트에서)
node scripts/queue-feed-content.mjs <pool.json 경로>            # DRY-RUN
node scripts/queue-feed-content.mjs <pool.json 경로> --apply    # 백업 후 적재

# 함수만 배포
firebase deploy --only functions:rotateFeedContent

# 로그
firebase functions:log --only rotateFeedContent
```

## 운영 전제와 권한

- Cloud Functions와 Cloud Scheduler 사용에는 Blaze 요금제가 필요하다.
- 배포자는 대상 프로젝트를 선택할 권한과 Cloud Functions 배포 권한, Cloud Scheduler 작업 관리 권한, 런타임 서비스 계정으로 배포할 수 있는 `Service Account User` 권한이 필요하다.
- Functions 런타임 서비스 계정에는 해당 프로젝트 Firestore 읽기·쓰기 권한과 기본 Storage 버킷 객체 목록·삭제 권한(예: `Storage Object Viewer`와 `Storage Object User` 또는 이에 준하는 커스텀 권한)이 필요하다.
- 기본 버킷은 `admin.storage().bucket()`으로 얻는다. 버킷명을 코드에 하드코딩하지 않으므로 프로젝트의 `firebasestorage.app` 신규 버킷 이름도 사용할 수 있다.

## 배포 절차

1. Firebase CLI 로그인 및 프로젝트 확인 후 Blaze 요금제와 위 IAM 권한을 확인한다.
2. 앱 레포 `docs/firebase/community-firestore.indexes.json`에 앱·서버 인덱스를 병합한다. 그룹을 배포한다면 [group.indexes.json](group.indexes.json)의 컬렉션 그룹 인덱스 2개도 함께 병합한다.
3. 앱 레포에서 `firebase deploy --only firestore:indexes`를 실행해 인덱스를 먼저 배포한다.
4. 이 레포의 `functions` 디렉터리 의존성이 준비된 상태에서 `npm --prefix functions run deploy`를 실행한다. `firebase.json`의 predeploy가 `cd functions && npx eslint .`에 해당하는 린트를 실행한다.
5. 배포 후 `firebase functions:log --only onCommunityUserDeleted,pruneCommunityCommentPlaceholders`로 로그와 Scheduler 생성 상태를 확인한다.

그룹 함수만 따로 올릴 때는 다음 목록을 쓴다. `onGroupDeleted`는 다른 함수가 부르는 연쇄의 끝이므로 함께 배포한다.

```bash
firebase deploy --only functions:onGroupCreated,functions:onGroupUpdated,functions:onGroupDeleted,functions:onGroupUserDeleted
```

배포가 필요할 때만 사용자의 프로젝트·대상 확인과 명시적 승인을 거쳐 실행한다. 이 문서의 작성·검증 중에는 배포나 `npm install`을 실행하지 않는다.

## 에뮬레이터와 로그

Java가 설치되어 있고 Firebase CLI가 로그인·프로젝트를 확인한 상태에서 다음처럼 함수 로딩을 확인한다.

```bash
firebase emulators:start --only functions
```

운영 로그는 다음 명령으로 확인한다.

```bash
firebase functions:log --only onCommunityPostStatusChanged
firebase functions:log --only onCommunityUserDeleted
```

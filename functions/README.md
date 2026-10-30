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

## 배낭 삭제 정리 `onBagDeleted`

[bagCleanup.js](bagCleanup.js)의 `onBagDeleted`는 `bag/{bagId}` 문서 삭제(v2 Firestore 트리거, `asia-northeast3`) 시 클라이언트가 지우지 않는 하위 데이터를 정리한다(앱 DM-30·DM-33). 클라이언트는 배낭 문서만 지운다.

- `bag/{bagId}/routes`: 400개 이하 페이지로 읽어 각 문서의 GPX 원본(`storagePath`, 없으면 `bags/{bagId}/routes/{routeId}.gpx`)을 먼저 지우고, 그 페이지의 문서를 배치로 지운다. `storagePath`는 소유자가 쓴 값이라 `bags/{bagId}/routes/` 접두 밖을 가리키면 믿지 않고 기본 경로로 대체한다(남의 파일 삭제 방지).
- `bag/{bagId}/points`: 400개 단위 배치로 전량 삭제한다.
- Storage `bags/{bagId}/routes/` 접두: 문서 정리가 끝난 뒤 남은 파일(문서 없이 업로드만 된 고아 파일)을 한 번 더 쓸어 지운다.
- 완료 시 `{bagId, routes, points, files}` 요약을 로그로 남긴다. `files`는 삭제(또는 이미 없음 확인)된 파일 수다.

### 배낭 정리 멱등성·재시도

배낭 삭제도 하드 삭제라 가드 필드를 두지 않고, 모든 단계를 재실행해도 같은 결과가 되게 짠다. 하위 문서 삭제는 본래 멱등이고 이미 지운 문서는 다음 쿼리에 잡히지 않는다. 파일을 문서보다 먼저 지우므로 도중에 실패해 재시도되어도 남은 문서의 `storagePath`를 다시 읽을 수 있다. Storage 삭제는 `ignoreNotFound: true`이고 404는 성공으로 본다. **그 밖의 Storage 오류는 로그만 남기고 던지지 않는다** — 파일 하나 때문에 문서 정리 재시도가 반복되지 않게 하기 위해서다. 남은 파일은 접두 쓸기가 한 번 더 시도한다. Firestore 오류는 던져 `retry: true`로 재배달을 받는다.

```bash
firebase deploy --only functions:onBagDeleted
```

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

## 주말 날씨 브리핑 `sendWeekendBriefing`

앱 레포 `specs/Notification.md` NT-11(주말 날씨 브리핑)·NT-12(푸시 토큰), 데이터 계약은 `specs/DataModel.md` DM-34·DM-35를 따른다. 코드는 [weekendBriefing.js](weekendBriefing.js)에 있다.

- **주기**: `every thursday 18:30`, `timeZone: Asia/Seoul`(매주 목요일 18:30 KST). 리전 `asia-northeast3`, `timeoutSeconds: 540`, `memory: 512MiB`, `maxInstances: 1`, `concurrency: 1`, `retryCount: 2`.
- **설정 `config/weekendBriefing`**(없으면 기본값): `{ enabled, maxTargets }`.
  - `enabled`(기본 `true`) — 유일한 중단 스위치다. `false`면 보내지 않고 실행 기록에 `lastSkip: {at, reason: "disabled"}`만 남긴다(이미 발송된 주의 `status`를 덮지 않는다). 발송 시각은 코드의 스케줄만 정한다.
  - `maxTargets`(기본 2000) — 한 주(`weekId`)에 보낼 uid 상한. 이번 회차는 `maxTargets - 이미 보낸 수`(최소 0)만큼만 처리하고, 넘친 수는 `logger.warn`으로 남긴다.
- **대상**: 컬렉션 그룹 `push-tokens where briefingEnabled == true`를 `users/{uid}` 단위로 묶는다. uid당 박지 1곳을 NT-11 우선순위로 고른다 — ① KST 날짜 기준 오늘~오늘+14일 안에 시작하는 배낭(`bag.userId == uid`, `location.campSpotId`) 중 가장 빠른 것(여행 날짜·D-day), ② `users/{uid}/camp-favorites`의 `createdAt` 최신 1건, ③ `location.campSpotId`가 있는 배낭 중 `endDate`가 가장 늦은 것. 고른 `camp-spot`이 없거나 `status != "active"`이거나 `name`이 비면 다음 순위로 내려가고, 셋 다 없으면 `skippedNoSpot`.
- **날씨**: Open-Meteo 일별 예보(`weather_code`, `temperature_2m_max/min`, `wind_speed_10m_max`, `wind_speed_unit=ms`, `timezone=Asia/Seoul`). 기본은 이번 토·일, ①은 여행 기간 최대 3일(내용에는 앞 2일, 비·바람 판단은 3일 전체). 요청은 10초 제한(`AbortSignal.timeout`), 429·5xx·네트워크 오류면 1.5초 뒤 한 번만 재시도하고, 한 묶음 안에서 동시에 8건까지만 보낸다. 같은 박지+기간은 실행 안에서 한 번만 조회한다(`spotWeatherCacheHits`) — 성공한 응답만 캐시하고 실패는 캐시하지 않는다. 그래도 실패하거나 빈 응답이면 `skippedNoWeather`. 날짜의 `weather_code`가 비면 상태는 `정보 없음`이다.
- **문구**: 제목 `이번 주말 {박지명}` / 내용 `토 {상태} {최저}°~{최고}° · 일 …`. ①은 제목 `D-{n} {박지명}`(KST 시작일이 오늘이면 `D-day`). 문구는 한국어만 만든다(토큰의 `locale`은 예약 필드). 상태는 앱 `WeatherCode.ts`의 한글 라벨과 같다. 비·눈 코드가 하루라도 있으면 ` · 비 예보`, 아니면 풍속 최대 ≥ 10m/s일 때 ` · 바람 주의`.
- **토큰 중복 제거**: 같은 `token` 값이 여러 uid 아래에 있으면(로그아웃 삭제 실패 뒤 다른 사용자 로그인 등) `updatedAt`이 가장 늦은 문서 하나만 보내고(같으면 uid 정렬상 뒤쪽) 나머지는 발송에서 뺀다 — 문서는 지우지 않고 실행 기록 `duplicateTokensSkipped`에 increment로 센다.
- **발송**: `sendEachForMulticast`로 uid의 모든 토큰에 보낸다. `data: {type: "weekend_briefing", route}` — ①은 `/bag/{bagId}`, ②③은 `/camp-site/{spotId}`. APNs·Android 사운드는 `default`. 토큰 문서 삭제 규칙: `messaging/registration-token-not-registered`는 삭제한다. `messaging/invalid-argument`는 같은 uid의 다른 토큰이 이번 발송에서 성공했을 때만(페이로드가 정상임이 확인된 경우) 삭제하고, 아니면 남겨 두고 실패로만 센다. 실행 전체 토큰 중 `invalid-argument`가 20%를 넘으면 페이로드 문제로 보고 그 실행의 남은 토큰 삭제를 모두 멈추며 경고 로그를 남긴다.
- **멱등성·실행 기록 `weekend-briefing-runs/{weekId}`**: `weekId`는 실행 시각(`event.scheduleTime`)의 KST ISO 주(`2026-W42`). 시작 시 문서의 `sentUids`를 읽어 건너뛰고, 10명 묶음마다 merge로 기록한다. 발송과 기록 사이에 끊기면 재시도 때 **최대 한 묶음(10명)** 이 다시 받을 수 있다해 시간 초과·재시도에도 같은 주에 두 번 보내지 않는다.
  - `sentUids` — `arrayUnion`.
  - `sent`·`skippedNoSpot`·`skippedNoWeather`·`failed`·`spotWeatherCacheHits`·`duplicateTokensSkipped` — `FieldValue.increment`로 그 주의 모든 실행(재시도 포함)을 누적한다. **시도 누적값이라 사용자 수가 아니다** — 건너뛴·실패한 uid는 재시도마다 다시 세어져 합이 `targets`보다 클 수 있다.
  - `targets` — 문서에 아직 없을 때(그 주 첫 실행)만 쓴다. `firstRanAt`도 한 번만 쓰고, `ranAt`은 마지막 실행 시각이다.
  - `status` — 한 명이라도 보내면 `published`, 이번에도 이전에도 보낸 사람이 없으면 `empty`. `enabled: false` 실행은 `status` 대신 `lastSkip`을 쓴다.
- **인덱스**: `push-tokens` / `briefingEnabled` 컬렉션 그룹 단일 필드 인덱스가 필요하다(DM-34 — 콘솔에서 켠다). `bag.userId ==`·`camp-favorites orderBy createdAt`은 자동 단일 필드 인덱스로 충분하다.

### 드라이런

환경 변수 `BRIEFING_DRY_RUN=1`이면 대상 선정·날씨 조회·문구 작성까지만 하고 제목·내용·`route`를 `[DRY-RUN]` 로그로 남긴다. **발송·토큰 삭제·실행 기록(`sentUids` 포함) 쓰기를 하지 않는다.** Firestore·Open-Meteo 읽기는 실제로 일어난다.

```bash
# functions 디렉터리에서 (실데이터 읽기 — 프로젝트 선택·로그인 확인 후)
BRIEFING_DRY_RUN=1 firebase functions:shell
> sendWeekendBriefing()

# 로그
firebase functions:log --only sendWeekendBriefing
```

shell 수동 실행은 `scheduleTime`이 없으면 현재 시각을 실행 시각(`weekId`·주말 계산 기준)으로 쓴다. 시각 가드가 없으므로 언제 실행해도 돈다 — 드라이런 없이 shell로 부르면 **실제로 발송**된다. 배포된 함수는 이 변수를 두지 않는다(프로덕션 발송).

### 배포 후 필수 — Scheduler 시도 기한 올리기

2세대 스케줄 함수의 Cloud Scheduler 작업은 **HTTP 타깃**이고 기본 시도 기한(`attemptDeadline`)이 **180초**라 함수 제한 540초보다 짧다. 그대로 두면 실행 도중 Scheduler가 실패로 보고 재시도를 보내 실행이 겹친다(`sentUids`로 같은 사용자 중복은 막지만 한 묶음 10명은 다시 받을 수 있다). **배포할 때마다 확인하고 올린다.**

```bash
gcloud scheduler jobs describe firebase-schedule-sendWeekendBriefing-asia-northeast3 --location asia-northeast3
gcloud scheduler jobs update http firebase-schedule-sendWeekendBriefing-asia-northeast3 \
  --location asia-northeast3 --attempt-deadline=600s
```

gcloud가 없으면 Cloud Scheduler REST(`PATCH …/jobs/{name}?updateMask=attemptDeadline`, body `{"attemptDeadline":"600s"}`)로 같은 일을 한다.

## 여행 도우미 `tripAssistant`

앱 레포 `specs/Assistant.md`(AS-1·AS-2·AS-4·AS-5·AS-6·AS-8·AS-9·AS-10·AS-12, 데이터 계약은 `specs/DataModel.md` DM-39)의 서버 부분이다. 사용자가 대화로 여행(배낭)을 계획하면 모델이 읽기 도구를 서버에서 부르고, 쓰기 도구는 실행하지 않고 앱에 돌려준다. 코드는 [tripAssistant.js](tripAssistant.js)(핸들러)와 [assistant/](assistant/)(`prompt.js` 시스템 프롬프트, `tools.js` 도구 선언·읽기 구현, `schema.js` 공급자별 스키마 정리, `engine.js` 검증·턴 루프, `usage.js` 일일 한도, `providers/{anthropic,gemini}.js`)에 있다.

- **형태**: v2 `onCall`, 리전 `asia-northeast3`, `timeoutSeconds: 120`, `memory: 512MiB`, `maxInstances: 10`, `invoker: "public"`(인증은 Firebase Auth ID 토큰 — `request.auth` 없으면 `unauthenticated`).
- **공급자 교체형**: `functions/.env`의 `ASSISTANT_PROVIDER`(`anthropic` | `gemini`, 기본 `gemini`)와 `ASSISTANT_MODEL`(기본 gemini `gemini-3.1-flash-lite` / anthropic `claude-haiku-4-5`). `functions/.env`는 비밀이 없는 설정이라 커밋 대상이다. 키는 시크릿 `GEMINI_API_KEY`·`ANTHROPIC_API_KEY`이고, **배포 전에 두 시크릿이 모두 존재해야 한다**(쓰지 않는 공급자 쪽도 함수가 바인딩한다). `ANTHROPIC_API_KEY`는 프로젝트의 다른 함수도 같은 시크릿을 쓴다 — 값을 바꾸면(`secrets:set --force`는 그 함수들도 새 버전으로 재배포한다) 함께 영향을 받는다. 공식 SDK `@google/genai`·`@anthropic-ai/sdk`만 쓴다.
  - Anthropic: 캐시 지점 3개 — 마지막 도구·`system`·마지막 사용자 메시지 블록(기록 캐시, 요청 사본에만 붙이고 앱 기록에는 남기지 않는다). 도구는 `strict: true`(숫자·길이·패턴 키워드는 strict가 지원하지 않아 `schema.js`로 제거, 선택 필드는 `required`에서 뺀 채 둔다). `max_tokens: 4096`, `output_config.effort: "low"`(Haiku 4.5·Sonnet 4.5는 effort를 거부해 생략), thinking 파라미터는 넣지 않는다(Haiku 4.5는 미지원, 5.x는 생략 시 adaptive). Fable 5/Opus 5/Sonnet 5.5 계열은 beta 클라이언트로 `fallbacks: "default"` + `server-side-fallback-2026-07-01`, Haiku 4.5 등은 넣지 않는다. 웹 검색 서버 도구(Haiku 4.5 등 이전 세대는 `web_search_20250305`, 그 밖은 `web_search_20260209`, 턴당 3회). `pause_turn`은 최대 3번 이어 보내고 넘으면 `unavailable`. 요청 타임아웃 `min(90초, 남은 시간)`, SDK 재시도는 남은 25초당 1회(최대 3회).
  - Gemini: 비스트리밍 `generateContent`, `parametersJsonSchema`(지원하지 않는 키워드 제거), `googleSearch` 그라운딩(429·400이면 그 요청에서 끄고 재시도 — 무료 등급은 매 요청 첫 호출이 429로 끝난다), 429는 안내 시간(최대 30초)만큼 최대 3회 대기, 5xx는 2초 뒤 최대 2회(둘 다 대기 뒤 다음 요청에 15초 이상 남을 때만), 요청 타임아웃 `min(90초, 남은 시간)`, `maxOutputTokens: 8192`.
- **무상태**: 앱이 공급자 원형 `history`를 보내고 함수는 이번 턴에 덧붙인 메시지를 `appended`로 돌려준다(append-only). 첫 요청이면 사용자 텍스트 앞에 `[오늘] {today} ({요일}) · 언어: {locale}`, `[달력]`(오늘부터 21일, 요일 포함 — 모델이 요일을 잘못 세는 문제 완화), `context.bagId`가 있으면 `[여행 현황]`(get_trip 결과)을 붙인다.
- **호출 계약**: 요청 `{provider?, history, userText? | toolResults?, locale, today, context: {bagId?}}` → 응답 `{provider, model, appended, text, pendingActions: [{id, name, input}], remaining, stopReason: "end"|"tool_use"|"refusal"|"max_tokens"}`. 스트리밍(`request.acceptsStreaming`)이면 `{type: "status", tool}`(읽기·웹 검색)·`{type: "text_delta", text}` 청크를 보낸다(Gemini는 텍스트를 한 번에).
- **도구 짝 맞추기**: `toolResults`는 기록 끝 모델 메시지의 쓰기 호출과 짝지어야 한다 — id가 있으면 id로, 없으면 쓰기 호출 순서·이름으로. Gemini `functionCall`에 id가 없으면 `call_{메시지 안 순번}`을 발급한다. 한 메시지에 읽기와 쓰기가 섞이면 쓰기만 `pendingActions`로 돌려주고, 같은 메시지의 읽기는 다음 요청(결과 이어 보내기)에서 서버가 실행해 쓰기 결과와 한 메시지로 합친다.
- **입력 검증**: `history`+`toolResults`+`userText` 직렬화 200KB, 메시지 80개, `userText` 2,000자, 결과 하나 8KB. 기록은 role(Anthropic `user`/`assistant`, Gemini `user`/`model`)을 확인하고, 금지 목록 방식으로 위험한 항목만 거부한다 — Anthropic `image`·`document`·`search_result`·`container_upload` 블록과 `cache_control`, Gemini `inlineData`·`fileData`·`executableCode`·`codeExecutionResult`(어느 깊이든, 도구 입력 `input`/`args` 안은 제외). 공급자가 새 블록 타입을 내도 서버가 push한 응답이 거부되지 않게 허용 목록을 쓰지 않는다([assistant/historyGuard.js](assistant/historyGuard.js)). 걸리면 `invalid-argument`. 한도 초과 `resource-exhausted`의 `details.kind`는 발화 한도면 `message`, 이어 보내기 한도면 `toolTurn`(문구 "요청이 너무 잦아요…", `remaining`은 실제 남은 발화 수).
- **시간 상한**: 함수 120초 안에서 공급자 작업은 시작 후 100초까지. 매 모델 호출 전에 남은 시간이 5초 미만이면 `unavailable`, 읽기 도구도 같은 기준으로 실행하지 않고 오류 결과를 돌려준다(Firestore 읽기엔 타임아웃이 없다). Anthropic은 `signal`로 재시도까지 포함한 전체 시간을 남은 예산에 묶는다.
- **읽기 상한**: 한 턴 8회. 넘으면 실행 대신 오류 결과를 돌려줘 모델이 마무리하게 한다. 모델 호출이 12회를 넘으면 `internal`(앱은 appended를 받지 못한 요청을 기록에 남기지 않는다).
- **오류**: `invalid-argument`(history 200KB·80개·userText 2,000자 초과, 짝 불일치), `resource-exhausted`(`details: {remaining: 0}`), `failed-precondition`(provider 불일치), `permission-denied`(남의 bagId), `unavailable`(공급자 429·5xx·연결, 재시도 뒤), `internal`. 거절·안전 차단은 오류가 아니라 고정 문구 + `stopReason: "refusal"`.
- **사용량(DM-39)**: `assistant-usage/{uid}` `{day(KST), count, toolTurnCount, updatedAt}`. `count`는 사용자 발화(하루 20회), `toolTurnCount`는 결과 이어 보내기(하루 60회 — 조작한 기록으로 발화 한도를 우회하지 못하게 하는 보조 상한). 검증·키 확인 통과 뒤, 모델 호출 전에 한 트랜잭션으로 센다. 응답 `remaining`은 발화 기준이다. 서버가 쓰는 문서는 이것뿐이다.
- **로그·개인정보(AS-10)**: uid 해시 앞 8자, 도구 이름·소요·결과 길이, 모델 호출별 토큰(Anthropic은 `cache_read_input_tokens` 포함), 턴 요약(stopReason·읽기 수·pendingActions 이름)만 남긴다. 대화 내용·도구 결과 본문은 남기지 않는다. 도구 결과에 uid·이메일·닉네임을 넣지 않는다.

```bash
# 함수만 배포(레포 루트)
firebase deploy --only functions:tripAssistant

# 스모크(3턴 대본, create_trip은 skipped로 응답 — 실제 여행을 만들지 않는다)
node scripts/assistant-smoke.mjs <계정 파일>

# 로그
firebase functions:log --only tripAssistant
```

### 모드 호출 `gear_fill`(장비 자동 채우기)

앱 레포 `specs/Assistant.md` AS-1(개정)·AS-4·AS-6·AS-13. 대화 대신 기존 화면의 버튼 한 번으로 부르는 **AI 액션**이다. `request.data.mode`가 있으면 이 경로, 없으면 위의 대화 경로(`history`/`userText`/`toolResults`, 보류 중이지만 호환 유지). 코드는 [assistant/gearFill.js](assistant/gearFill.js).

- **요청**: `{mode: "gear_fill", context: {bagId}, locale: "ko"|"en"|"ja", today: "YYYY-MM-DD"}`. 기록 없음(요청마다 독립), 비스트리밍.
- **응답**: `{mode, provider, model, result: {headline, items: [{gearId, source, name, brand, weightG, group, priority, reason}], notes, trip: {name, startDate, endDate, locationName, weatherLine}} | null, refused, remaining}`.
- **순서**: 검증(`mode`·`bagId`·`locale`·`today`) → 키 확인 → `get_trip`(소유자 확인 — `not-found`·`permission-denied`, 메모 본문은 뺀다) → 사용량 `count` +1(대화 발화와 같은 20회/일) → 모델.
- **모델 입력**: 첫 메시지 = `[오늘]`·`[달력]`·`[여행 현황]` + "이 여행에 담을 장비를 골라 propose_gear로 답하세요". 시스템 프롬프트는 `GEAR_FILL_PROMPT`(대화형과 별개, 불변). 도구는 읽기 `list_warehouse`·`get_popular_gear`·`search_catalog`·`get_forecast` + 결과 도구 `propose_gear`만(박지 검색·쓰기 도구 없음). 웹 검색 끔.
- **결과 도구 강제**: Gemini는 `functionCallingConfig.mode = ANY`(허용 목록 = 이 모드 도구). Anthropic은 프롬프트로 유도하고, 텍스트로 끝나면 "propose_gear 도구를 호출해 답하세요"를 한 번 더 보낸다. 그래도 없으면 `internal`. 결과 도구는 실행하지 않고 루프를 끝낸다(대화 경로의 쓰기 도구와 같은 경로).
- **상한**: 모델 호출 8회(넘으면 `internal`), `search_catalog` 6회(넘으면 오류 결과), 읽기 8회, 시간 예산은 대화 경로와 같다.
- **검증(AS-13)**: 이 턴의 읽기 결과에 실제로 있던 `gearId`만 통과(창고 → `warehouse`, 인기·카탈로그 → `catalog`). 이름·브랜드·무게·그룹·출처는 도구 결과 값으로 덮어쓴다. 여행에 이미 담긴 id·중복 id 제외, essential 먼저 정렬, 필수 그룹(텐트·침낭·매트·배낭)은 그룹당 1개(의류·기타 등은 날씨 추가가 여럿일 수 있어 자르지 않는다), 15개, `reason` 40자·`headline` 60자·`notes` 3개(각 80자). 버린 개수는 로그 `dropped`에만.
- **`trip.weatherLine`**: 서버가 `bag.weather.daily`(여행 기간)에서 만든 한 줄 — `11/7~8 최저 -8° · 비 90% · 돌풍 15m/s`(locale별 라벨). 날씨 캐시가 없으면 이 턴에 `get_forecast`로 받은 예보로 만들고, 둘 다 없으면 `null`.
- **거절**: `result: null`, `refused: true`.
- **로그**: `mode`, 도구 이름·ms·결과 길이, 모델 호출별 토큰, `items`·`essential`·`catalog`·`dropped`·`notes` 개수만. 추천 내용·장비 이름은 남기지 않는다.

```bash
# 스모크: 테스트 계정의 테스트 배낭 2개(여행지 있음/없음)를 찾거나 만들고 각각 호출(호출당 사용량 1회)
node scripts/assistant-gear-fill-smoke.mjs <계정 파일> [--only with|without]
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

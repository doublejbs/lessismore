# 커뮤니티 Cloud Functions

커뮤니티 게시글·댓글·반응·멘션·공개 사진의 후속 정리를 담당하는 Firebase Cloud Functions다. Firebase 프로젝트 `lessismore-7e070`, 기본 Storage 버킷, 리전 `asia-northeast3`를 사용한다. 기존 `naverShoppingSearch`와 `uploadImageFromUrl` 함수는 이 모듈과 독립적으로 유지한다.

## 함수와 트리거

- `onCommunityPostStatusChanged`: `community-posts/{postId}` 문서가 `published`에서 `hidden`으로 바뀌거나 `deleted`가 아닌 상태에서 `deleted`로 바뀔 때 실행한다. `deleted`는 댓글·좋아요·투표를 400개 단위 배치로 삭제하고 제목·본문·사진·배낭 스냅샷·투표·작성자 닉네임·카운트를 툼스톤 값으로 정리한다. 툼스톤의 `authorId`는 보존하고 닉네임만 제거한다. `hidden`은 운영 검토·해제가 가능하므로 댓글·좋아요·투표와 카운트를 유지하고 `community/{authorId}/{postId}/` 사진과 `images`만 정리한다. `hidden` 뒤 `deleted`로 바뀌면 삭제 정리를 별도로 수행한다.
- `onCommunityCommentHidden`: 댓글이 `published`에서 `hidden`으로 바뀔 때 부모 게시글 `commentCount`를 트랜잭션으로 0 미만이 되지 않도록 보정한다. 댓글 문서의 보정 표식을 함께 기록해 이벤트 재시도 시 중복 차감을 막는다. `deleted` 전환은 클라이언트가 카운트를 보정하므로 건드리지 않는다.
- `onCommunityUserDeleted`: Firebase Auth 사용자 삭제(v1 Auth 트리거) 뒤 작성 게시글을 `deleted`로 전환하고, 작성 댓글·좋아요·투표를 트랜잭션과 400개 단위 배치로 정리한다. 답글이 남은 댓글은 `status: "deleted"`, `deletedReason: "withdrawal"` 자리표시로 바꾸며 `authorId`는 유지하고 `authorName`·본문·멘션 식별자는 제거한다. 탈퇴자의 멘션을 참조하는 모든 댓글은 `mentionedUserName`을 빈 값으로 만들고 `mentionedUserId`를 삭제한다. `community/{uid}/` Storage 사진을 삭제하며 `community-reports`와 그 안의 `reporterId`는 운영 기록으로 보존한다.
- `cleanupOrphanCommunityImages`: 24시간마다 `community/` Storage를 검사한다. 파일을 게시글 ID별로 묶어 게시글 문서를 한 번씩만 읽고, 게시글이 없거나 `deleted`·`hidden`이거나 `images[].storagePath`에 없는 파일을 삭제한다. `timeCreated`가 최근 24시간 이내인 업로드는 작성 중일 수 있으므로 건너뛴다.
- `pruneCommunityCommentPlaceholders`: 매일 `status == "deleted"` 댓글을 400개 단위로 검사한다. 최상위 댓글은 `parentId` 답글이 하나도 없을 때 삭제하고, 답글이 남아 있으면 유지한다. `parentId`가 있는 삭제 답글 자리표시는 답글 대상이 없으므로 삭제한다. 삭제된 문서가 이미 없거나 재시도되어도 같은 결과가 되도록 멱등적으로 동작한다.

## 삭제 정책과 알려진 한계

- 앱은 댓글 삭제를 항상 소프트 삭제(`status: "deleted"`, `deletedReason: "author"`)로 기록한다. `pruneCommunityCommentPlaceholders`가 답글이 없는 자리표시를 나중에 물리 삭제하고, 답글이 있는 최상위 자리표시는 답글이 남아 있는 동안 유지한다.
- 게시글·댓글 툼스톤은 `authorId`를 유지하고 작성자 닉네임·본문 등 표시 정보를 제거한다. 신고 기록은 운영 감사 목적상 삭제하지 않으며 `reporterId`도 보존한다.
- 탈퇴자 좋아요·투표는 게시글이 `published` 또는 `hidden`일 때 카운트를 보정한다. `hidden` 해제 시 댓글 `commentCount` 재증가는 미구현(알려진 한계)이다.

## 멱등성·재시도

Firestore 삭제는 대상이 이미 없으면 다음 실행에서 남은 대상만 처리한다. 게시글 정리는 상태별 완료 표식인 `hiddenCleanedAt`과 `deletedCleanedAt`을 사용한다. 따라서 `hidden` 정리가 끝난 뒤 `deleted`로 바뀌어도 삭제 정리가 실행되며, 각 단계가 실패한 뒤 재실행되어도 완료된 단계는 반복하지 않는다. 댓글 숨김·탈퇴 처리는 트랜잭션 안에서 현재 문서와 카운트를 함께 확인한다. 게시글 상태 변경과 Auth 삭제는 재시도 옵션을 켜고, 두 스케줄 함수도 최대 3회 재시도하도록 설정하며, Storage 삭제는 `ignoreNotFound: true`를 사용한다.

## 인덱스

서버 전용 컬렉션 그룹 인덱스는 다음 3개다.

- `comments` / `authorId ASCENDING`: 탈퇴 작성 댓글 조회
- `comments` / `status ASCENDING`: 삭제 댓글 자리표시 정리
- `comments` / `mentionedUserId ASCENDING`: 탈퇴자 멘션 참조 정리

이 목록은 [community.indexes.json](community.indexes.json)에 기록했지만, 앱 레포의 `docs/firebase/community-firestore.indexes.json`이 Firestore 인덱스를 배포하는 단일 파일이다. 앱 레포의 게시글 2개·댓글 1개·신고 1개 인덱스 목록에 위 서버 전용 인덱스도 병합해 달라고 요청한 뒤, 그 단일 파일을 배포한다. 단일 필드 인덱스가 이미 자동 생성된 프로젝트에서도 컬렉션 그룹 쿼리용 서버 인덱스는 배포 전에 확인한다.

```bash
firebase deploy --only firestore:indexes
```

## 운영 전제와 권한

- Cloud Functions와 Cloud Scheduler 사용에는 Blaze 요금제가 필요하다.
- 배포자는 대상 프로젝트를 선택할 권한과 Cloud Functions 배포 권한, Cloud Scheduler 작업 관리 권한, 런타임 서비스 계정으로 배포할 수 있는 `Service Account User` 권한이 필요하다.
- Functions 런타임 서비스 계정에는 해당 프로젝트 Firestore 읽기·쓰기 권한과 기본 Storage 버킷 객체 목록·삭제 권한(예: `Storage Object Viewer`와 `Storage Object User` 또는 이에 준하는 커스텀 권한)이 필요하다.
- 기본 버킷은 `admin.storage().bucket()`으로 얻는다. 버킷명을 코드에 하드코딩하지 않으므로 프로젝트의 `firebasestorage.app` 신규 버킷 이름도 사용할 수 있다.

## 배포 절차

1. Firebase CLI 로그인 및 프로젝트 확인 후 Blaze 요금제와 위 IAM 권한을 확인한다.
2. 앱 레포 `docs/firebase/community-firestore.indexes.json`에 앱·서버 인덱스를 병합한다.
3. 앱 레포에서 `firebase deploy --only firestore:indexes`를 실행해 인덱스를 먼저 배포한다.
4. 이 레포의 `functions` 디렉터리 의존성이 준비된 상태에서 `npm --prefix functions run deploy`를 실행한다. `firebase.json`의 predeploy가 `cd functions && npx eslint .`에 해당하는 린트를 실행한다.
5. 배포 후 `firebase functions:log --only onCommunityUserDeleted,pruneCommunityCommentPlaceholders`로 로그와 Scheduler 생성 상태를 확인한다.

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

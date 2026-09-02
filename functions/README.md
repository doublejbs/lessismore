# 커뮤니티 Cloud Functions

커뮤니티 게시글·댓글·반응·공개 사진의 후속 정리를 담당하는 Firebase Cloud Functions다. Firebase 프로젝트 `lessismore-7e070`, 기본 Storage 버킷, 리전 `asia-northeast3`를 사용한다. 기존 `naverShoppingSearch`와 `uploadImageFromUrl` 함수는 이 모듈과 독립적으로 유지한다.

## 함수와 트리거

- `onCommunityPostStatusChanged`: `community-posts/{postId}` 문서가 `published`에서 `deleted` 또는 `hidden`으로 바뀔 때 실행한다. 댓글, 좋아요, 투표를 400개 단위 배치로 삭제하고 `community/{authorId}/{postId}/` 사진을 삭제한다. `deleted`는 제목·본문·사진·배낭 스냅샷·투표·작성자 닉네임·카운트를 툼스톤 값으로 정리하고, `hidden`은 운영 검토용 본문을 남긴 채 사진과 `images`만 정리한다.
- `onCommunityCommentHidden`: 댓글이 `published`에서 `hidden`으로 바뀔 때 부모 게시글 `commentCount`를 트랜잭션으로 0 미만이 되지 않도록 보정한다. 댓글 문서의 보정 표식을 함께 기록해 이벤트 재시도 시 중복 차감을 막는다. `deleted` 전환은 클라이언트가 카운트를 보정하므로 건드리지 않는다.
- `onCommunityUserDeleted`: Firebase Auth 사용자 삭제(v1 Auth 트리거) 뒤 작성 게시글을 `deleted`로 전환하고, 작성 댓글·좋아요·투표를 트랜잭션과 배치로 정리한다. 답글이 남은 댓글은 `deletedReason: "withdrawal"` 자리표시로 바꾸며, 마지막 답글 삭제 시 탈퇴 자리표시 최상위 댓글도 삭제한다. 작성자의 `community/{uid}/` Storage 사진도 삭제하고 `community-reports`는 운영 기록이므로 보존한다.
- `cleanupOrphanCommunityImages`: 24시간마다 `community/` Storage를 검사한다. 게시글이 없거나 `deleted`·`hidden`이거나 `images[].storagePath`에 없는 파일을 삭제하며, `timeCreated`가 최근 24시간 이내인 업로드는 작성 중일 수 있으므로 건너뛴다.

## 멱등성·재시도

Firestore 삭제는 대상이 이미 없으면 다음 실행에서 남은 대상만 처리한다. 게시글 정리는 `cleanedAt`이 이미 있으면 종료하고, 댓글 숨김·탈퇴 처리는 트랜잭션 안에서 현재 문서와 카운트를 함께 확인한다. 게시글 상태 변경과 Auth 삭제는 재시도 옵션을 켜고, 스케줄 함수도 최대 3회 재시도하도록 설정하며, Storage 삭제는 `ignoreNotFound: true`를 사용한다. 각 단계가 실패한 뒤 재실행되어도 카운트를 0 아래로 내리지 않고 중복 차감하지 않도록 처리한다.

## 인덱스

탈퇴 댓글 정리의 `collectionGroup("comments").where("authorId", "==", uid)` 쿼리를 위해 컬렉션 그룹 범위의 `comments / authorId ASCENDING` 인덱스가 필요하다. 배포 형식은 [community.indexes.json](community.indexes.json)에 기록했으며, Firebase 콘솔에서 `comments` 컬렉션 그룹 범위로 생성하거나 프로젝트 Firestore 인덱스 파일에 병합한 뒤 다음 명령을 사용한다.

```bash
firebase deploy --only firestore:indexes
```

게시글 2개, 댓글 1개, 신고 1개 등 앱 측 인덱스 4개는 앱 레포의 `community/docs/firebase/community-firestore.indexes.json`을 참고한다.

## 운영 전제와 권한

- Cloud Functions와 Cloud Scheduler 사용에는 Blaze 요금제가 필요하다.
- Functions 실행 서비스 계정에 해당 프로젝트 Firestore 읽기·쓰기 권한과 기본 Storage 버킷 객체 목록·삭제 권한(예: `Storage Object Viewer`와 `Storage Object User` 또는 이에 준하는 커스텀 권한)이 필요하다.
- 기본 버킷은 `admin.storage().bucket()`으로 얻는다. 버킷명을 코드에 하드코딩하지 않으므로 프로젝트의 `firebasestorage.app` 신규 버킷 이름도 사용할 수 있다.
- `community-reports`의 `reporterId`를 탈퇴 후에도 보존할지는 DM-28에 정책이 없어 운영 결정이 필요하다. 현재 함수는 신고 기록을 삭제하지 않는다.

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

배포가 필요할 때만 사용자의 프로젝트·대상 확인과 명시적 승인을 거쳐 실행한다. 배포 명령은 다음과 같으며, 이 문서 작성·검증 중에는 실행하지 않는다.

```bash
npm --prefix functions run deploy
# firebase deploy --only functions
```

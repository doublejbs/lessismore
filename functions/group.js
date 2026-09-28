import admin from "firebase-admin";
import {
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import * as functionsV1 from "firebase-functions/v1";
import {logger} from "firebase-functions";

const REGION = "asia-northeast3";
const FIRESTORE_BATCH_SIZE = 400;
const STORAGE_BATCH_SIZE = 50;
// 배치가 NOT_FOUND 로 깨졌을 때 문서별 재시도를 동시에 보내는 상한.
const DOCUMENT_RETRY_CONCURRENCY = 50;
const MAX_INSTANCES = 10;

// gRPC status code. admin SDK 는 사라진 문서를 update 할 때 이 코드를 던진다.
const NOT_FOUND_CODE = 5;

// 그룹 문서가 사라지면 함께 사라져야 하는 하위 컬렉션(DM-29).
// 네 컬렉션의 문서는 모두 평평하고 자신의 하위 컬렉션을 갖지 않는다 —
// 중첩이 생기면 문서 삭제로는 손자 문서가 지워지지 않으므로 여기를 함께 고쳐야 한다.
const GROUP_SUBCOLLECTIONS = ["members", "bags", "points", "routes"];

// 역인덱스 요약(users/{uid}/groups/{groupId})이 그룹 문서에서 따오는 필드.
// hasBag·bagId·joinedAt 은 본인만 쓰는 값이라 서버가 건드리지 않는다.
const REVERSE_INDEX_SOURCE_FIELDS = [
  "name",
  "startDate",
  "endDate",
  "ownerId",
  "campSpotId",
  "destinationName",
];

// 초대 공개 요약(groupInvites/{groupId})이 복제하는 값(DM-29).
// meetingNote·memberIds·ownerId·campSpotId·카운트는 절대 복제하지 않는다.
const INVITE_MIRROR_VALUE_KEYS = [
  "name",
  "startDate",
  "endDate",
  "destinationName",
  "memberCount",
  "inviteEnabled",
];

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const {FieldValue} = admin.firestore;

// 버킷은 함수 실행 시점에 가져와 로컬 import가 기본 버킷 환경변수 없이도 가능하게 한다.
const getDefaultBucket = () => admin.storage().bucket();

const getGroupRef = (groupId) => db.collection("groups").doc(groupId);

const getInviteMirrorRef = (groupId) =>
  db.collection("groupInvites").doc(groupId);

const getReverseIndexRef = (uid, groupId) =>
  db.collection("users").doc(uid).collection("groups").doc(groupId);

const readString = (value) => (typeof value === "string" ? value : "");

const readMemberIds = (data) => {
  if (!Array.isArray(data.memberIds)) {
    return [];
  }

  return data.memberIds.filter(
    (uid) => typeof uid === "string" && uid.length > 0
  );
};

// 인원수는 memberIds 를 우선한다 — memberCount 는 캐시라 뒤처질 수 있다(DM-29).
// 미러 문서처럼 memberIds 가 아예 없는 곳에서는 저장된 memberCount 를 읽는다.
const readMemberCount = (data) => {
  if (Array.isArray(data.memberIds)) {
    return readMemberIds(data).length;
  }

  if (typeof data.memberCount === "number" &&
    Number.isFinite(data.memberCount)) {
    return Math.max(0, Math.trunc(data.memberCount));
  }

  return 0;
};

const hasSameMembers = (beforeIds, afterIds) => {
  const beforeSet = new Set(beforeIds);
  const afterSet = new Set(afterIds);

  if (beforeSet.size !== afterSet.size) {
    return false;
  }

  return [...beforeSet].every((uid) => afterSet.has(uid));
};

const hasFieldChange = (beforeData, afterData, fields) =>
  fields.some((field) => beforeData[field] !== afterData[field]);

const splitIntoChunks = (items, size) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

/**
 * 쿼리 결과를 400개 이하의 Firestore 배치로 반복 삭제한다.
 * 삭제가 일부만 완료된 뒤 재시도되어도 남은 문서만 다시 처리한다.
 */
const deleteQueryInBatches = async (query, batchSize = FIRESTORE_BATCH_SIZE) => {
  let deletedCount = 0;
  let hasMore = true;

  while (hasMore) {
    const snapshot = await query.limit(batchSize).get();
    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
    deletedCount += snapshot.size;

    if (snapshot.size < batchSize) {
      hasMore = false;
    }
  }

  return deletedCount;
};

/**
 * 참조 목록을 400개 이하의 배치로 삭제한다. 없는 문서 삭제는 성공으로 취급된다.
 */
const deleteRefsInBatches = async (refs) => {
  if (refs.length === 0) {
    return 0;
  }

  for (const refChunk of splitIntoChunks(refs, FIRESTORE_BATCH_SIZE)) {
    const batch = db.batch();
    refChunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  return refs.length;
};

/**
 * {ref, data} 목록을 배치로 갱신한다.
 * set 이 아니라 update 를 쓴다 — 사라진 문서를 되살리지 않기 위해서다.
 * 배치 도중 대상이 사라졌으면 문서별로 다시 시도해 없는 것만 건너뛴다.
 */
const updateEntriesInBatches = async (entries) => {
  if (entries.length === 0) {
    return 0;
  }

  let updatedCount = 0;

  for (const entryChunk of splitIntoChunks(entries, FIRESTORE_BATCH_SIZE)) {
    const batch = db.batch();
    entryChunk.forEach((entry) => batch.update(entry.ref, entry.data));

    try {
      await batch.commit();
      updatedCount += entryChunk.length;
      continue;
    } catch (error) {
      if (error?.code !== NOT_FOUND_CODE) {
        throw error;
      }
    }

    const retryChunks = splitIntoChunks(entryChunk, DOCUMENT_RETRY_CONCURRENCY);
    for (const retryChunk of retryChunks) {
      const results = await Promise.all(
        retryChunk.map(async (entry) => {
          try {
            await entry.ref.update(entry.data);

            return true;
          } catch (documentError) {
            if (documentError?.code !== NOT_FOUND_CODE) {
              throw documentError;
            }

            return false;
          }
        })
      );
      updatedCount += results.filter(Boolean).length;
    }
  }

  return updatedCount;
};

/**
 * 그룹 코스 GPX 원본(Storage `groups/{groupId}/routes/`)을 지운다.
 */
const deleteGroupRouteFiles = async (groupId) => {
  if (!groupId || groupId.includes("/")) {
    logger.warn("그룹 코스 파일 경로를 만들 수 없어 건너뜁니다.", {groupId});

    return 0;
  }

  const prefix = `groups/${groupId}/routes/`;
  const [files] = await getDefaultBucket().getFiles({prefix});
  let deletedCount = 0;

  for (const fileChunk of splitIntoChunks(files, STORAGE_BATCH_SIZE)) {
    await Promise.all(
      fileChunk.map((file) => file.delete({ignoreNotFound: true}))
    );
    deletedCount += fileChunk.length;
  }

  return deletedCount;
};

/**
 * 역인덱스 요약을 만든다. 없는 선택 필드는 지워 낡은 값이 남지 않게 한다.
 * role 은 uid 마다 달라 호출부에서 덧붙인다.
 */
const buildReverseIndexSummary = (groupData) => {
  const campSpotId = readString(groupData.campSpotId);
  const destinationName = readString(groupData.destinationName);

  return {
    name: readString(groupData.name),
    startDate: readString(groupData.startDate),
    endDate: readString(groupData.endDate),
    ownerId: readString(groupData.ownerId),
    memberCount: readMemberCount(groupData),
    campSpotId: campSpotId || FieldValue.delete(),
    destinationName: destinationName || FieldValue.delete(),
  };
};

/**
 * 남아 있는 멤버 전원의 역인덱스 요약을 다시 쓴다(DM-29 서버 작업).
 * 클라이언트는 본인 문서만 쓸 수 있어 인원수·이름이 남의 목록에서 낡은 값으로 굳는다.
 * 문서 생성은 참여한 본인 몫이라 서버는 update 만 한다 — 트리거 재전달이 늦게
 * 도착해도 이미 해산된 그룹의 역인덱스를 되살리지 않는다.
 */
const syncReverseIndexes = async (groupId, groupData, memberIds) => {
  if (memberIds.length === 0) {
    return 0;
  }

  const summary = buildReverseIndexSummary(groupData);
  const ownerId = readString(groupData.ownerId);
  const entries = memberIds.map((uid) => ({
    ref: getReverseIndexRef(uid, groupId),
    data: {...summary, role: uid === ownerId ? "owner" : "member"},
  }));

  return updateEntriesInBatches(entries);
};

/**
 * 그룹에서 빠진 uid 의 멤버 문서·배낭 스냅샷·역인덱스를 지운다.
 * 멤버 문서와 스냅샷은 클라이언트도 지우지만, 역인덱스는 남의 문서라 서버 몫이다(GRP-4).
 */
const removeMemberArtifacts = async (groupId, uids) => {
  if (uids.length === 0) {
    return 0;
  }

  const groupRef = getGroupRef(groupId);
  const refs = [];
  uids.forEach((uid) => {
    refs.push(groupRef.collection("members").doc(uid));
    refs.push(groupRef.collection("bags").doc(uid));
    refs.push(getReverseIndexRef(uid, groupId));
  });
  await deleteRefsInBatches(refs);

  return uids.length;
};

// 미러가 담는 값만 뽑아 정규화한다. 그룹 문서와 미러 문서 양쪽에 쓸 수 있다.
const readInviteMirrorValues = (data) => ({
  name: readString(data.name),
  startDate: readString(data.startDate),
  endDate: readString(data.endDate),
  destinationName: readString(data.destinationName),
  memberCount: readMemberCount(data),
  inviteEnabled: data.inviteEnabled !== false,
});

const hasSameInviteMirrorValues = (beforeData, afterData) => {
  const before = readInviteMirrorValues(beforeData);
  const after = readInviteMirrorValues(afterData);

  return INVITE_MIRROR_VALUE_KEYS.every((key) => before[key] === after[key]);
};

/**
 * 초대 공개 요약을 만든다. 원본 스프레드 없이 일곱 필드만 명시로 고른다(DM-29).
 */
const buildInviteMirror = (values) => {
  const mirror = {
    name: values.name,
    startDate: values.startDate,
    endDate: values.endDate,
    memberCount: values.memberCount,
    inviteEnabled: values.inviteEnabled,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (values.destinationName) {
    mirror.destinationName = values.destinationName;
  }

  return mirror;
};

/**
 * 초대 공개 요약을 그룹 문서에 맞춘다.
 * 트랜잭션 안에서 그룹 문서를 다시 읽으므로, 옛 이벤트가 늦게 도착해도
 * 이미 해산된 그룹의 공개 문서를 되살리지 않는다(삭제는 onGroupDeleted 몫).
 * 저장된 미러와 값이 같으면 쓰지 않는다 — 무의미한 공개 문서 쓰기를 막는다.
 */
const syncInviteMirror = async (groupId) => {
  const groupRef = getGroupRef(groupId);
  const mirrorRef = getInviteMirrorRef(groupId);

  return db.runTransaction(async (transaction) => {
    const groupSnapshot = await transaction.get(groupRef);
    if (!groupSnapshot.exists) {
      return false;
    }

    const mirrorSnapshot = await transaction.get(mirrorRef);

    const groupData = groupSnapshot.data() || {};
    if (mirrorSnapshot.exists &&
      hasSameInviteMirrorValues(mirrorSnapshot.data() || {}, groupData)) {
      return false;
    }

    transaction.set(
      mirrorRef, buildInviteMirror(readInviteMirrorValues(groupData))
    );

    return true;
  });
};

export const onGroupCreated = onDocumentCreated({
  document: "groups/{groupId}",
  region: REGION,
  retry: true,
  timeoutSeconds: 540,
  memory: "512MiB",
  maxInstances: MAX_INSTANCES,
}, async (event) => {
  const groupId = event.params.groupId;
  const mirrorWritten = await syncInviteMirror(groupId);

  logger.info("그룹 초대 공개 요약을 맞췄습니다.", {groupId, mirrorWritten});
});

export const onGroupUpdated = onDocumentUpdated({
  document: "groups/{groupId}",
  region: REGION,
  retry: true,
  timeoutSeconds: 540,
  memory: "512MiB",
  maxInstances: MAX_INSTANCES,
}, async (event) => {
  const beforeSnapshot = event.data?.before;
  if (!beforeSnapshot?.exists) {
    return;
  }

  const groupId = event.params.groupId;

  // 이벤트 스냅샷이 아니라 지금의 그룹 문서를 근거로 쓴다.
  // 트리거 전달은 at-least-once 이고 순서를 보장하지 않아, 옛 이벤트가 늦게
  // 도착하면 이미 돌아온 멤버의 문서를 지우거나 낡은 이름을 되쓸 수 있다.
  const latestSnapshot = await getGroupRef(groupId).get();
  const isGroupAlive = latestSnapshot.exists;
  const beforeData = beforeSnapshot.data() || {};
  const latestData = isGroupAlive ? latestSnapshot.data() || {} : {};
  const beforeMemberIds = readMemberIds(beforeData);
  const latestMemberIds = readMemberIds(latestData);
  const removedUids = beforeMemberIds.filter(
    (uid) => !latestMemberIds.includes(uid)
  );

  // 빠진 멤버 정리는 그룹이 이미 해산됐어도 수행한다. 전부 삭제라 되살릴 위험이
  // 없고, 내보내기 직후 해산하면 onGroupDeleted 는 그 uid 를 알 방법이 없다 —
  // 삭제 스냅샷의 memberIds 와 members 하위 문서 양쪽에서 이미 빠져 있기 때문이다.
  const removedCount = await removeMemberArtifacts(groupId, removedUids);

  if (!isGroupAlive) {
    if (removedCount > 0) {
      logger.info("해산된 그룹에서 빠진 멤버를 정리했습니다.", {
        groupId,
        removedCount,
      });
    }

    return;
  }

  const membersChanged = !hasSameMembers(beforeMemberIds, latestMemberIds);
  const summaryChanged = hasFieldChange(
    beforeData, latestData, REVERSE_INDEX_SOURCE_FIELDS
  );

  // 인원수가 바뀌었든 정보가 바뀌었든 남은 멤버 전원의 요약을 다시 쓴다.
  let syncedCount = 0;
  if (membersChanged || summaryChanged) {
    syncedCount = await syncReverseIndexes(groupId, latestData, latestMemberIds);
  }

  // 미러 값이 그대로면 트랜잭션 자체를 건너뛴다 — 포인트·코스 추가처럼
  // 카운트만 바뀌는 쓰기마다 그룹 문서에 읽기 잠금을 걸지 않기 위해서다.
  const mirrorWritten = hasSameInviteMirrorValues(beforeData, latestData) ?
    false :
    await syncInviteMirror(groupId);

  if (removedCount > 0 || syncedCount > 0 || mirrorWritten) {
    logger.info("그룹 수정 후속 정리를 완료했습니다.", {
      groupId,
      removedCount,
      syncedCount,
      mirrorWritten,
    });
  }
});

export const onGroupDeleted = onDocumentDeleted({
  document: "groups/{groupId}",
  region: REGION,
  retry: true,
  timeoutSeconds: 540,
  memory: "512MiB",
  maxInstances: MAX_INSTANCES,
}, async (event) => {
  const groupId = event.params.groupId;
  const groupData = event.data?.data() || {};
  const groupRef = getGroupRef(groupId);

  // 공개 문서를 가장 먼저 지운다 — 뒤 단계가 실패해 재시도를 기다리는 동안
  // 해산된 그룹의 이름·기간이 비인증 랜딩에 계속 노출되면 안 된다.
  await getInviteMirrorRef(groupId).delete();

  // 멤버 uid 는 삭제 직전 스냅샷과 members 하위 문서를 합쳐 모은다.
  // 재시도로 하위 문서가 이미 지워졌어도 스냅샷의 memberIds 가 남아 있다.
  const memberUids = new Set(readMemberIds(groupData));
  const memberSnapshot = await groupRef.collection("members").get();
  memberSnapshot.docs.forEach((document) => memberUids.add(document.id));

  // 역인덱스가 남으면 남은 멤버의 목록에 해산된 그룹이 유령으로 뜬다(DM-29).
  const indexCount = await deleteRefsInBatches(
    [...memberUids].map((uid) => getReverseIndexRef(uid, groupId))
  );

  const [documentCounts, fileCount] = await Promise.all([
    Promise.all(
      GROUP_SUBCOLLECTIONS.map(
        (collectionId) => deleteQueryInBatches(groupRef.collection(collectionId))
      )
    ),
    deleteGroupRouteFiles(groupId),
  ]);

  logger.info("그룹 해산 연쇄 정리를 완료했습니다.", {
    groupId,
    documentCount: documentCounts.reduce((sum, count) => sum + count, 0),
    fileCount,
    indexCount,
  });
});

// collectionGroup 은 DB 전체에서 같은 이름의 컬렉션을 잡는다.
// 그룹 하위(`groups/{groupId}/{collectionId}`)가 아닌 동명 컬렉션은 건드리지 않는다.
const isGroupSubcollectionDoc = (ref, collectionId) =>
  ref.parent.id === collectionId &&
  ref.parent.parent?.parent?.id === "groups";

/**
 * 탈퇴자가 올린 포인트·코스는 남기고 작성자 이름만 비운다(GRP-12).
 * 화면은 authorId 가 멤버 목록에 없고 이름이 비면 `(탈퇴한 사용자)`로 그린다.
 * 커서 페이지네이션을 쓴다 — 이름을 비워도 authorId 조건에는 계속 걸리기 때문이다.
 */
const clearWithdrawnAuthorNames = async (collectionId, uid) => {
  const query = db.collectionGroup(collectionId).where("authorId", "==", uid);
  let lastDocument = null;
  let clearedCount = 0;
  let hasMore = true;

  while (hasMore) {
    let pageQuery = query.limit(FIRESTORE_BATCH_SIZE);
    if (lastDocument) {
      pageQuery = pageQuery.startAfter(lastDocument);
    }

    const snapshot = await pageQuery.get();
    if (snapshot.empty) {
      break;
    }

    const entries = snapshot.docs
      .filter((document) => isGroupSubcollectionDoc(document.ref, collectionId))
      .filter((document) => readString(document.data()?.authorName) !== "")
      .map((document) => ({ref: document.ref, data: {authorName: ""}}));
    clearedCount += await updateEntriesInBatches(entries);
    lastDocument = snapshot.docs[snapshot.docs.length - 1];

    if (snapshot.size < FIRESTORE_BATCH_SIZE) {
      hasMore = false;
    }
  }

  return clearedCount;
};

/**
 * 탈퇴자를 그룹 하나에서 뺀다. memberIds·memberCount 는 트랜잭션으로 줄이고,
 * 멤버 문서·배낭 스냅샷·역인덱스는 그 뒤에 지운다(모두 멱등).
 */
const detachMemberFromGroup = async (groupRef, uid) => {
  await db.runTransaction(async (transaction) => {
    const groupSnapshot = await transaction.get(groupRef);
    if (!groupSnapshot.exists) {
      return;
    }

    const groupData = groupSnapshot.data() || {};
    // 탈퇴자만 빼고 나머지 원소는 그대로 둔다 — 정규화는 이 트리거의 일이 아니다.
    const currentIds = Array.isArray(groupData.memberIds) ?
      groupData.memberIds :
      [];
    const nextIds = currentIds.filter((memberId) => memberId !== uid);
    if (nextIds.length === currentIds.length) {
      return;
    }

    transaction.update(groupRef, {
      memberIds: nextIds,
      memberCount: nextIds.length,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await removeMemberArtifacts(groupRef.id, [uid]);
};

/**
 * 탈퇴자가 속한 모든 그룹을 처리한다.
 * 방장인 그룹은 문서를 지워 해산하고, 하위 정리는 onGroupDeleted 가 연쇄로 맡는다.
 */
const removeUserFromGroups = async (uid) => {
  const query = db.collection("groups")
    .where("memberIds", "array-contains", uid);
  const disbandedGroupIds = [];
  let lastDocument = null;
  let leftCount = 0;
  let hasMore = true;

  while (hasMore) {
    // 처리한 그룹은 결과 집합에서 빠지지만 커서로도 넘겨 반복을 확실히 끝낸다.
    let pageQuery = query.limit(FIRESTORE_BATCH_SIZE);
    if (lastDocument) {
      pageQuery = pageQuery.startAfter(lastDocument);
    }

    const snapshot = await pageQuery.get();
    if (snapshot.empty) {
      break;
    }

    for (const groupSnapshot of snapshot.docs) {
      const groupData = groupSnapshot.data() || {};
      if (readString(groupData.ownerId) === uid) {
        await groupSnapshot.ref.delete();
        disbandedGroupIds.push(groupSnapshot.id);
        continue;
      }

      await detachMemberFromGroup(groupSnapshot.ref, uid);
      leftCount += 1;
    }

    lastDocument = snapshot.docs[snapshot.docs.length - 1];

    if (snapshot.size < FIRESTORE_BATCH_SIZE) {
      hasMore = false;
    }
  }

  return {disbandedGroupIds, leftCount};
};

export const onGroupUserDeleted = functionsV1
  .region(REGION)
  .runWith({
    failurePolicy: {retry: {}},
    timeoutSeconds: 540,
    memory: "512MB",
    maxInstances: MAX_INSTANCES,
  })
  .auth.user().onDelete(async (user) => {
    const uid = user.uid;

    // 이름 비우기를 먼저 한다 — 해산이 먼저면 지워지는 중인 문서를 건드리게 된다.
    const [pointCount, routeCount] = await Promise.all([
      clearWithdrawnAuthorNames("points", uid),
      clearWithdrawnAuthorNames("routes", uid),
    ]);
    const {disbandedGroupIds, leftCount} = await removeUserFromGroups(uid);
    const indexCount = await deleteQueryInBatches(
      db.collection("users").doc(uid).collection("groups")
    );

    logger.info("그룹 회원 탈퇴 정리를 완료했습니다.", {
      pointCount,
      routeCount,
      leftCount,
      indexCount,
      // 해산은 되돌릴 수 없으므로 어떤 그룹이 사라졌는지 남긴다.
      disbandedGroupIds,
    });
  });

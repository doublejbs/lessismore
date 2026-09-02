import admin from "firebase-admin";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as functionsV1 from "firebase-functions/v1";
import {logger} from "firebase-functions";

const REGION = "asia-northeast3";
const FIRESTORE_BATCH_SIZE = 400;
const STORAGE_BATCH_SIZE = 50;
const ORPHAN_UPLOAD_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;
const MAX_INSTANCES = 10;

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const {FieldValue} = admin.firestore;

// 버킷은 함수 실행 시점에 가져와 로컬 import가 기본 버킷 환경변수 없이도 가능하게 한다.
const getDefaultBucket = () => admin.storage().bucket();

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
      hasMore = false;
      continue;
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
 * Storage prefix에 속한 파일을 찾고 없는 파일도 성공으로 취급하며 삭제한다.
 */
const deleteStoragePrefix = async (prefix) => {
  if (!prefix || !prefix.startsWith("community/")) {
    return 0;
  }

  const [files] = await getDefaultBucket().getFiles({prefix});
  let deletedCount = 0;

  for (let index = 0; index < files.length; index += STORAGE_BATCH_SIZE) {
    const fileBatch = files.slice(index, index + STORAGE_BATCH_SIZE);
    await Promise.all(
      fileBatch.map((file) => file.delete({ignoreNotFound: true}))
    );
    deletedCount += fileBatch.length;
  }

  return deletedCount;
};

const decrementCounter = (value) => {
  const current = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(0, current - 1);
};

const isPostCleanupTransition = (beforeData, afterData) => {
  const becameDeleted = beforeData.status !== "deleted" &&
    afterData.status === "deleted";
  const becameHidden = beforeData.status === "published" &&
    afterData.status === "hidden";
  return becameDeleted || becameHidden;
};

const cleanCommunityPost = async (postRef, postData) => {
  const cleanupField = postData.status === "deleted"
    ? "deletedCleanedAt"
    : "hiddenCleanedAt";
  if (postData[cleanupField]) {
    return false;
  }

  const authorId = typeof postData.authorId === "string" ? postData.authorId : "";
  const postId = postRef.id;

  if (postData.status === "deleted") {
    await deleteQueryInBatches(
      postRef.collection("comments")
    );
    await deleteQueryInBatches(
      db.collection("community-post-likes").where("postId", "==", postId)
    );
    await deleteQueryInBatches(
      db.collection("community-poll-votes").where("postId", "==", postId)
    );
  }

  if (authorId) {
    await deleteStoragePrefix(`community/${authorId}/${postId}/`);
  }

  await db.runTransaction(async (transaction) => {
    const latestSnapshot = await transaction.get(postRef);
    if (!latestSnapshot.exists) {
      return;
    }

    const latestData = latestSnapshot.data() || {};
    if (latestData[cleanupField]) {
      return;
    }

    if (latestData.status === "deleted") {
      transaction.update(postRef, {
        title: "",
        body: "",
        images: [],
        bagSnapshot: FieldValue.delete(),
        poll: FieldValue.delete(),
        authorName: "",
        commentCount: 0,
        likeCount: 0,
        deletedCleanedAt: FieldValue.serverTimestamp(),
      });
    } else if (latestData.status === "hidden") {
      transaction.update(postRef, {
        images: [],
        hiddenCleanedAt: FieldValue.serverTimestamp(),
      });
    }
  });

  return true;
};

export const onCommunityPostStatusChanged = onDocumentUpdated({
  document: "community-posts/{postId}",
  region: REGION,
  retry: true,
  timeoutSeconds: 540,
  memory: "512MiB",
  maxInstances: MAX_INSTANCES,
}, async (event) => {
  const beforeSnapshot = event.data?.before;
  const afterSnapshot = event.data?.after;
  if (!beforeSnapshot?.exists || !afterSnapshot?.exists) {
    return;
  }

  const beforeData = beforeSnapshot.data() || {};
  const afterData = afterSnapshot.data() || {};
  if (!isPostCleanupTransition(beforeData, afterData)) {
    return;
  }

  const cleaned = await cleanCommunityPost(afterSnapshot.ref, afterData);
  if (cleaned) {
    logger.info("커뮤니티 게시글 후속 정리를 완료했습니다.", {
      status: afterData.status,
    });
  }
});

export const onCommunityCommentHidden = onDocumentUpdated({
  document: "community-posts/{postId}/comments/{commentId}",
  region: REGION,
  retry: true,
  timeoutSeconds: 540,
  memory: "512MiB",
  maxInstances: MAX_INSTANCES,
}, async (event) => {
  const beforeSnapshot = event.data?.before;
  const afterSnapshot = event.data?.after;
  if (!beforeSnapshot?.exists || !afterSnapshot?.exists) {
    return;
  }

  const beforeData = beforeSnapshot.data() || {};
  const afterData = afterSnapshot.data() || {};
  if (beforeData.status !== "published" || afterData.status !== "hidden") {
    return;
  }

  const commentRef = afterSnapshot.ref;
  const postRef = commentRef.parent.parent;
  if (!postRef) {
    return;
  }

  await db.runTransaction(async (transaction) => {
    const commentSnapshot = await transaction.get(commentRef);
    if (!commentSnapshot.exists) {
      return;
    }

    const commentData = commentSnapshot.data() || {};
    if (commentData.status !== "hidden" || commentData.hiddenCountAdjustedAt) {
      return;
    }

    const postSnapshot = await transaction.get(postRef);
    if (postSnapshot.exists) {
      const postData = postSnapshot.data() || {};
      transaction.update(postRef, {
        commentCount: decrementCounter(postData.commentCount),
      });
    }
    transaction.update(commentRef, {
      hiddenCountAdjustedAt: FieldValue.serverTimestamp(),
    });
  });
});

const updatePostsForWithdrawnUser = async (uid) => {
  const query = db.collection("community-posts")
    .where("authorId", "==", uid);
  const snapshot = await query.get();
  const documentsToUpdate = snapshot.docs.filter((document) => {
    const postData = document.data() || {};
    return postData.status !== "deleted";
  });
  let updatedCount = 0;

  for (let index = 0; index < documentsToUpdate.length;
    index += FIRESTORE_BATCH_SIZE) {
    const documentBatch = documentsToUpdate.slice(
      index, index + FIRESTORE_BATCH_SIZE
    );
    const batch = db.batch();
    documentBatch.forEach((document) => {
      batch.update(document.ref, {
        status: "deleted",
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
    updatedCount += documentBatch.length;
  }

  return updatedCount;
};

const processWithdrawnComment = async (commentSnapshot, uid) => {
  const commentRef = commentSnapshot.ref;
  const postRef = commentRef.parent.parent;
  if (!postRef) {
    return;
  }

  await db.runTransaction(async (transaction) => {
    const commentDocument = await transaction.get(commentRef);
    if (!commentDocument.exists) {
      return;
    }

    const commentData = commentDocument.data() || {};
    if (commentData.authorId !== uid || commentData.withdrawalProcessedAt) {
      return;
    }

    const postDocument = await transaction.get(postRef);
    const childReplies = await transaction.get(
      postRef.collection("comments")
        .where("parentId", "==", commentRef.id)
        .limit(1)
    );
    let parentDocument = null;
    let siblingReplies = null;
    if (commentData.parentId) {
      const parentRef = postRef.collection("comments").doc(commentData.parentId);
      parentDocument = await transaction.get(parentRef);
      siblingReplies = await transaction.get(
        postRef.collection("comments")
          .where("parentId", "==", commentData.parentId)
          .limit(2)
      );
    }

    const hasReplies = !childReplies.empty;
    const postData = postDocument.exists ? postDocument.data() || {} : {};
    const shouldDecrement = postDocument.exists &&
      postData.status === "published" && commentData.status === "published";

    if (hasReplies) {
      transaction.update(commentRef, {
        status: "deleted",
        deletedReason: "withdrawal",
        body: "",
        authorId: "",
        authorName: "",
        mentionedUserId: FieldValue.delete(),
        mentionedUserName: FieldValue.delete(),
        withdrawalProcessedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      transaction.delete(commentRef);
    }

    if (shouldDecrement) {
      transaction.update(postRef, {
        commentCount: decrementCounter(postData.commentCount),
      });
    }

    // 탈퇴한 답글이 마지막 답글이면, 이미 탈퇴 자리표시인 최상위 댓글도 정리한다.
    if (commentData.parentId && !hasReplies && parentDocument?.exists &&
      siblingReplies?.size <= 1) {
      const parentData = parentDocument.data() || {};
      if (parentData.status === "deleted" &&
        parentData.deletedReason === "withdrawal") {
        transaction.delete(parentDocument.ref);
      }
    }
  });
};

const processWithdrawnComments = async (uid) => {
  const query = db.collectionGroup("comments").where("authorId", "==", uid);
  let processedCount = 0;

  let hasMore = true;
  while (hasMore) {
    const snapshot = await query.limit(FIRESTORE_BATCH_SIZE).get();
    if (snapshot.empty) {
      hasMore = false;
      continue;
    }

    for (const commentSnapshot of snapshot.docs) {
      await processWithdrawnComment(commentSnapshot, uid);
    }
    processedCount += snapshot.size;

    if (snapshot.size < FIRESTORE_BATCH_SIZE) {
      hasMore = false;
    }
  }

  return processedCount;
};

const processWithdrawnLike = async (likeSnapshot, uid) => {
  const likeRef = likeSnapshot.ref;
  const likeData = likeSnapshot.data() || {};
  const postId = typeof likeData.postId === "string" ? likeData.postId : "";
  if (!postId || likeData.userId !== uid) {
    return;
  }

  const postRef = db.collection("community-posts").doc(postId);
  await db.runTransaction(async (transaction) => {
    const likeDocument = await transaction.get(likeRef);
    const postDocument = await transaction.get(postRef);
    if (!likeDocument.exists) {
      return;
    }

    transaction.delete(likeRef);
    if (postDocument.exists) {
      const postData = postDocument.data() || {};
      if (postData.status === "published") {
        transaction.update(postRef, {
          likeCount: decrementCounter(postData.likeCount),
        });
      }
    }
  });
};

const processWithdrawnLikes = async (uid) => {
  const query = db.collection("community-post-likes").where("userId", "==", uid);
  let processedCount = 0;

  let hasMore = true;
  while (hasMore) {
    const snapshot = await query.limit(FIRESTORE_BATCH_SIZE).get();
    if (snapshot.empty) {
      hasMore = false;
      continue;
    }

    for (const likeSnapshot of snapshot.docs) {
      await processWithdrawnLike(likeSnapshot, uid);
    }
    processedCount += snapshot.size;

    if (snapshot.size < FIRESTORE_BATCH_SIZE) {
      hasMore = false;
    }
  }

  return processedCount;
};

const processWithdrawnVote = async (voteSnapshot, uid) => {
  const voteRef = voteSnapshot.ref;
  const voteData = voteSnapshot.data() || {};
  const postId = typeof voteData.postId === "string" ? voteData.postId : "";
  if (!postId || voteData.userId !== uid) {
    return;
  }

  const postRef = db.collection("community-posts").doc(postId);
  await db.runTransaction(async (transaction) => {
    const voteDocument = await transaction.get(voteRef);
    const postDocument = await transaction.get(postRef);
    if (!voteDocument.exists) {
      return;
    }

    transaction.delete(voteRef);
    if (!postDocument.exists) {
      return;
    }

    const postData = postDocument.data() || {};
    const poll = postData.poll;
    if (!poll || !Array.isArray(poll.options)) {
      return;
    }

    const options = poll.options.map((option) => {
      if (option.id !== voteData.optionId) {
        return option;
      }
      return {
        ...option,
        voteCount: decrementCounter(option.voteCount),
      };
    });
    transaction.update(postRef, {
      poll: {
        ...poll,
        options,
        totalVoteCount: decrementCounter(poll.totalVoteCount),
      },
    });
  });
};

const processWithdrawnVotes = async (uid) => {
  const query = db.collection("community-poll-votes").where("userId", "==", uid);
  let processedCount = 0;

  let hasMore = true;
  while (hasMore) {
    const snapshot = await query.limit(FIRESTORE_BATCH_SIZE).get();
    if (snapshot.empty) {
      hasMore = false;
      continue;
    }

    for (const voteSnapshot of snapshot.docs) {
      await processWithdrawnVote(voteSnapshot, uid);
    }
    processedCount += snapshot.size;

    if (snapshot.size < FIRESTORE_BATCH_SIZE) {
      hasMore = false;
    }
  }

  return processedCount;
};

export const onCommunityUserDeleted = functionsV1
  .region(REGION)
  .runWith({
    failurePolicy: {retry: {}},
    timeoutSeconds: 540,
    memory: "512MB",
    maxInstances: MAX_INSTANCES,
  })
  .auth.user().onDelete(async (user) => {
    const uid = user.uid;
    const postCount = await updatePostsForWithdrawnUser(uid);
    const commentCount = await processWithdrawnComments(uid);
    const likeCount = await processWithdrawnLikes(uid);
    const voteCount = await processWithdrawnVotes(uid);
    const storageCount = await deleteStoragePrefix(`community/${uid}/`);

    logger.info("커뮤니티 회원 탈퇴 정리를 완료했습니다.", {
      postCount,
      commentCount,
      likeCount,
      voteCount,
      storageCount,
      reportsRetained: true,
    });
  });

const isRecentUpload = (timeCreated) => {
  if (!timeCreated) {
    return false;
  }

  const createdAt = new Date(timeCreated).getTime();
  return Number.isFinite(createdAt) &&
    Date.now() - createdAt < ORPHAN_UPLOAD_GRACE_PERIOD_MS;
};

const inspectCommunityFile = async (file) => {
  const [metadata] = await file.getMetadata();
  if (isRecentUpload(metadata.timeCreated)) {
    return {deleted: false, recent: true};
  }

  const pathParts = file.name.split("/");
  if (pathParts.length < 4 || pathParts[0] !== "community" ||
    !pathParts[1] || !pathParts[2]) {
    return {deleted: false, recent: false};
  }

  const postRef = db.collection("community-posts").doc(pathParts[2]);
  const postSnapshot = await postRef.get();
  let shouldDelete = !postSnapshot.exists;
  if (postSnapshot.exists) {
    const postData = postSnapshot.data() || {};
    const images = Array.isArray(postData.images) ? postData.images : [];
    const isReferenced = images.some((image) => image?.storagePath === file.name);
    shouldDelete = postData.status === "deleted" ||
      postData.status === "hidden" || !isReferenced;
  }

  if (!shouldDelete) {
    return {deleted: false, recent: false};
  }

  await file.delete({ignoreNotFound: true});
  return {deleted: true, recent: false};
};

export const cleanupOrphanCommunityImages = onSchedule({
  schedule: "every 24 hours",
  region: REGION,
  timeoutSeconds: 540,
  memory: "512MiB",
  maxInstances: 1,
  retryCount: 3,
}, async () => {
  const [files] = await getDefaultBucket().getFiles({prefix: "community/"});
  let deletedCount = 0;
  let recentCount = 0;

  for (const file of files) {
    const result = await inspectCommunityFile(file);
    if (result.deleted) {
      deletedCount += 1;
    }
    if (result.recent) {
      recentCount += 1;
    }
  }

  logger.info("커뮤니티 고아 사진 정리를 완료했습니다.", {
    scannedCount: files.length,
    deletedCount,
    recentCount,
  });
});

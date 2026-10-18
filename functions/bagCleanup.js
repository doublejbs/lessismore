import admin from "firebase-admin";
import {onDocumentDeleted} from "firebase-functions/v2/firestore";
import {logger} from "firebase-functions";

const REGION = "asia-northeast3";
const FIRESTORE_BATCH_SIZE = 400;
const STORAGE_BATCH_SIZE = 50;
const MAX_INSTANCES = 10;
const HTTP_NOT_FOUND = 404;

// 배낭 문서가 사라지면 함께 사라져야 하는 하위 컬렉션(앱 DM-30 routes, DM-33 points).
// 두 컬렉션의 문서는 평평하고 자신의 하위 컬렉션을 갖지 않는다.
const ROUTES_COLLECTION = "routes";
const POINTS_COLLECTION = "points";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

// 버킷은 함수 실행 시점에 가져와 로컬 import가 기본 버킷 환경변수 없이도 가능하게 한다.
const getDefaultBucket = () => admin.storage().bucket();

const getBagRef = (bagId) => db.collection("bag").doc(bagId);

const getRoutePrefix = (bagId) => `bags/${bagId}/routes/`;

const readString = (value) => (typeof value === "string" ? value : "");

// Storage 삭제 동시 호출 수(그룹 정리와 같은 값).
const STORAGE_DELETE_CONCURRENCY = 50;

const splitIntoChunks = (items, size) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const isNotFoundError = (error) =>
  error?.code === HTTP_NOT_FOUND || error?.code === "404";

/**
 * 코스 문서가 가리키는 GPX 원본 경로를 정한다.
 * `storagePath` 는 클라이언트(배낭 소유자)가 쓴 값이라 그대로 믿지 않는다 —
 * 이 배낭의 코스 접두 밖을 가리키면 남의 파일을 지울 수 있으므로 기본 경로로 대체한다.
 */
const resolveRouteStoragePath = (bagId, routeId, routeData) => {
  const prefix = getRoutePrefix(bagId);
  const fallbackPath = `${prefix}${routeId}.gpx`;
  const storagePath = readString(routeData.storagePath);

  if (!storagePath) {
    return fallbackPath;
  }

  if (!storagePath.startsWith(prefix) || storagePath.includes("..")) {
    logger.warn("코스 storagePath 가 배낭 접두 밖이라 기본 경로로 대체합니다.", {
      bagId,
      routeId,
      storagePath,
    });

    return fallbackPath;
  }

  return storagePath;
};

/**
 * Storage 객체 하나를 지운다. 없는 파일은 성공으로 보고, 그 밖의 오류는
 * 로그만 남기고 삼킨다 — 남은 파일은 접두 쓸기가 한 번 더 시도한다.
 */
const deleteStorageFile = async (bucket, storagePath, context) => {
  try {
    await bucket.file(storagePath).delete({ignoreNotFound: true});

    return true;
  } catch (error) {
    if (isNotFoundError(error)) {
      return true;
    }

    logger.error("배낭 코스 GPX 파일 삭제에 실패했습니다.", {
      ...context,
      storagePath,
      error: error?.message,
    });

    return false;
  }
};

/**
 * `routes` 문서를 400개 이하 페이지로 읽어, 각 문서의 GPX 원본을 먼저 지우고
 * 그 페이지의 문서를 배치로 지운다. 파일을 먼저 지우는 것은 재시도 시에도
 * `storagePath` 를 읽을 수 있게 하기 위해서다. 이미 지워진 문서는 다음 쿼리에 잡히지 않는다.
 */
const deleteRoutesWithFiles = async (bagId, bucket) => {
  const routesRef = getBagRef(bagId).collection(ROUTES_COLLECTION);
  let routeCount = 0;
  let fileCount = 0;
  let hasMore = true;

  while (hasMore) {
    const snapshot = await routesRef.limit(FIRESTORE_BATCH_SIZE).get();

    if (snapshot.empty) {
      break;
    }

    const storagePaths = snapshot.docs.map((document) =>
      resolveRouteStoragePath(bagId, document.id, document.data() || {})
    );

    for (const pathChunk of splitIntoChunks(storagePaths, STORAGE_BATCH_SIZE)) {
      const results = await Promise.all(
        pathChunk.map((storagePath) =>
          deleteStorageFile(bucket, storagePath, {bagId})
        )
      );
      fileCount += results.filter(Boolean).length;
    }

    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
    routeCount += snapshot.size;

    if (snapshot.size < FIRESTORE_BATCH_SIZE) {
      hasMore = false;
    }
  }

  return {routeCount, fileCount};
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
 * `bags/{bagId}/routes/` 접두에 남은 파일을 쓸어 지운다.
 * 문서 없이 업로드만 된 파일(업로드 후 문서 쓰기 실패·롤백 실패)이 여기 걸린다.
 * 실패는 로그만 남기고 삼킨다 — 파일 정리 때문에 문서 정리 재시도를 반복하지 않는다.
 */
const sweepRouteFiles = async (bagId, bucket) => {
  const prefix = getRoutePrefix(bagId);

  try {
    const [files] = await bucket.getFiles({prefix});
    let deletedCount = 0;

    // group.js 와 같은 방식 — 파일별 delete(ignoreNotFound) 를 묶음으로 보낸다.
    // deleteFiles({force}) 는 목록을 다시 읽고 실패를 배열로 던져 404 판정·집계가 어긋난다.
    for (const fileChunk of splitIntoChunks(files, STORAGE_DELETE_CONCURRENCY)) {
      const results = await Promise.allSettled(
        fileChunk.map((file) => file.delete({ignoreNotFound: true}))
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          deletedCount += 1;
        } else {
          logger.warn("배낭 코스 접두 파일 삭제 실패", {
            bagId,
            prefix,
            error: result.reason?.message,
          });
        }
      }
    }

    return deletedCount;
  } catch (error) {
    if (isNotFoundError(error)) {
      return 0;
    }

    logger.error("배낭 코스 접두 파일 정리에 실패했습니다.", {
      bagId,
      prefix,
      error: error?.message,
    });

    return 0;
  }
};

export const onBagDeleted = onDocumentDeleted({
  document: "bag/{bagId}",
  region: REGION,
  retry: true,
  timeoutSeconds: 540,
  memory: "512MiB",
  maxInstances: MAX_INSTANCES,
}, async (event) => {
  const bagId = event.params.bagId;

  if (!bagId || bagId.includes("/")) {
    logger.warn("배낭 ID가 올바르지 않아 정리를 건너뜁니다.", {bagId});

    return;
  }

  const bucket = getDefaultBucket();
  const bagRef = getBagRef(bagId);

  const [{routeCount, fileCount}, pointCount] = await Promise.all([
    deleteRoutesWithFiles(bagId, bucket),
    deleteQueryInBatches(bagRef.collection(POINTS_COLLECTION)),
  ]);

  // 문서별 삭제가 끝난 뒤 접두를 한 번 더 쓴다 — 남은 고아 파일만 걸린다.
  const sweptCount = await sweepRouteFiles(bagId, bucket);

  logger.info("배낭 삭제 연쇄 정리를 완료했습니다.", {
    bagId,
    routes: routeCount,
    points: pointCount,
    files: fileCount + sweptCount,
  });
});

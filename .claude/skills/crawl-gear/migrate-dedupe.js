/**
 * gear 중복 문서 통합 마이그레이션 스크립트
 *
 * 스펙: .claude/skills/crawl-gear/migrate-dedupe.md (단일 진실 공급원)
 *
 * 사용법 (Node 20 필수 — firebase-admin 이 Node 22+ 에서 크래시):
 *   node migrate-dedupe.js --backup                       # Phase 0: NDJSON 덤프
 *   node migrate-dedupe.js --plan                         # Phase 1: 읽기 전용 스캔 → plan + HTML 리포트
 *   node migrate-dedupe.js --apply [--dry-run] [--yes]    # Phase 2: 적용 (참조는 실행 시 재스캔)
 *   node migrate-dedupe.js --verify                       # Phase 3: 읽기 전용 재검증 (실패 시 exit 1)
 *   node migrate-dedupe.js --restore --from=<dir> [--only=<컬렉션>] [--yes]
 *
 * gear id 참조 지점: gear / users~gears / bag.gears / users~bagTemplates.gears /
 *   gear-rank / gear-review / gear-comments(요약+2단 트리) / comment-likes.gearId /
 *   feed-content.relatedGearId
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp, GeoPoint, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, createWriteStream, createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const OUT_DIR = join(__dirname, 'out');
const PLAN_PATH = join(OUT_DIR, 'dedupe-plan.json');
const REPORT_PATH = join(OUT_DIR, 'dedupe-report.html');
const FEEDBACK_PATH = join(OUT_DIR, 'dedupe-feedback.json');
const APPLY_LOG_PREFIX = 'dedupe-apply-';

// Phase 1.5 — 리포트 피드백 서버 (로컬 전용, Firestore 미접속)
const FEEDBACK_PORT = 3848;
const FEEDBACK_ROUTE = '/feedback';
const FEEDBACK_BODY_LIMIT = 5 * 1024 * 1024;

const FeedbackDecision = Object.freeze({
  Approve: 'approve',
  Exclude: 'exclude',
});

// 그룹 출처 — 정확 중복 자동 그룹 vs 사용자가 리포트에서 병합 승인한 유사 중복
const GroupOrigin = Object.freeze({
  Exact: 'exact',
  NearDuplicate: 'nearDuplicate',
});

// 유사 중복 메모 해석 규칙
const MERGE_APPROVAL_PATTERN = /병합/;
const COMPANY_OVERRIDE_PATTERN = /^(.+?)\s*로\s*병합/;

// plan 산출 형식 버전. 구조가 바뀌면 올리고, apply 는 불일치 plan 을 거부한다.
const PLAN_VERSION = 2;

const KEY_PATH = process.env.FIREBASE_SERVICE_ACCOUNT
  ? process.env.FIREBASE_SERVICE_ACCOUNT
  : join(__dirname, 'serviceAccountKey.json');

// Firestore batch 최대 500 op. 여유를 두고 450 에서 커밋한다.
const BATCH_LIMIT = 450;

// Algolia 검색 전용(공개) 자격 — src/firebase/SearchStore.ts 와 동일한 값.
const ALGOLIA_APP_ID = 'BWS6CWRXRM';
const ALGOLIA_SEARCH_KEY = 'dafcc0c015856d4ca5fb6d0626cf8f9f';
const ALGOLIA_INDEX = 'useless-gear-search';
const ALGOLIA_SAMPLE_SIZE = 10;

// 컬렉션 이름
const GEAR = 'gear';
const BAG = 'bag';
const USERS = 'users';
const USER_GEARS = 'gears';
const BAG_TEMPLATES = 'bagTemplates';
const GEAR_RANK = 'gear-rank';
const GEAR_REVIEW = 'gear-review';
const GEAR_COMMENTS = 'gear-comments';
const COMMENTS = 'comments';
const COMMENT_LIKES = 'comment-likes';
const FEED_CONTENT = 'feed-content';

// 스펙 §결정 3 — 최신 문서에서 가져오는 카탈로그 필드 (imageUrl 은 별도 규칙)
const CATALOG_FIELDS = [
  'company',
  'companyKorean',
  'name',
  'nameKorean',
  'color',
  'colorKorean',
  'size',
  'sizeKorean',
  'weight',
  'category',
  'groupId',
  'productUrl',
];

// plan 스냅샷과 현재 문서를 비교해 "plan 이후 편집"을 판정할 필드
// (dedupeKey 밖 필드까지 봐야 manage 인라인 편집을 잡을 수 있다)
const CATALOG_COMPARE_FIELDS = [...CATALOG_FIELDS, 'imageUrl'];

// 배열 합집합 대상 필드 (전역 gear / 사용자 창고 공통)
const ARRAY_FIELDS = ['bags', 'useless', 'used'];

// gear-rank / gear-review 복사 시 canonicalId 로 강제 교체해야 하는 필드
// (앱은 문서 ID 가 아니라 이 필드로 gear 를 조회한다 — 누락 시 랭킹/리뷰 탈락)
const GEAR_ID_FIELDS = ['id', 'gearId'];

// gear-comments 요약 문서의 합산 대상 카운터
const SUMMARY_COUNTERS = ['totalCount', 'parentCount', 'ratingSum', 'ratingCount'];

// 사용자 복사본 충돌 판정에 쓰는 비교 필드 (앱에서 직접 수정 가능한 값들)
const USER_COMPARE_FIELDS = [
  'name',
  'nameKorean',
  'company',
  'companyKorean',
  'color',
  'colorKorean',
  'size',
  'sizeKorean',
  'weight',
  'category',
  'imageUrl',
  'memo',
  'description',
];

// 유사 중복 유형 (자동 병합 금지 — 수동 검토용)
const NearDuplicateType = Object.freeze({
  EnglishNameMatch: 'englishNameMatch',
  EmptyVariant: 'emptyVariant',
  GroupIdMatch: 'groupIdMatch',
  CompanyLabelDiff: 'companyLabelDiff',
});

// 백업 NDJSON 파일 이름 → 복원 시 --only 키로도 사용
const BACKUP_FILES = Object.freeze({
  gear: 'gear.ndjson',
  userGears: 'user-gears.ndjson',
  bag: 'bag.ndjson',
  bagTemplates: 'bag-templates.ndjson',
  gearRank: 'gear-rank.ndjson',
  gearReview: 'gear-review.ndjson',
  gearComments: 'gear-comments.ndjson',
  commentLikes: 'comment-likes.ndjson',
  feedContent: 'feed-content.ndjson',
});

// ── LAZY INIT ─────────────────────────────────────────────────────
// usage 출력 전에 firebase-admin 이 초기화되지 않도록 반드시 지연 초기화한다.
let db;

const init = () => {
  if (db) {
    return db;
  }

  if (getApps().length === 0) {
    const sa = JSON.parse(readFileSync(KEY_PATH, 'utf-8'));

    initializeApp({
      credential: cert(sa),
      storageBucket: `${sa.project_id}.appspot.com`,
    });
  }
  db = getFirestore();

  return db;
};

// ── 공통 유틸 ──────────────────────────────────────────────────────
const norm = (s) => (s ?? '').toString().trim().replace(/\s+/g, ' ').toLowerCase();

/** 스펙 §결정 1 — 자동 병합 판정 키 */
const dedupeKey = (d) =>
  [norm(d.company), norm(d.nameKorean || d.name), norm(d.color), norm(d.size)].join('|');

/** 유사 중복 탐지용 키들 */
const englishKey = (d) => [norm(d.company), norm(d.name), norm(d.color), norm(d.size)].join('|');
const companyNameKey = (d) => [norm(d.company), norm(d.nameKorean || d.name)].join('|');
const groupIdKey = (d) => [norm(d.groupId), norm(d.color), norm(d.size)].join('|');
const nameOnlyKey = (d) => [norm(d.nameKorean || d.name), norm(d.color), norm(d.size)].join('|');

const toNum = (v) => {
  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : 0;
  }

  const n = parseFloat(String(v ?? '').replace(/,/g, ''));

  return Number.isFinite(n) ? n : 0;
};

const isBlank = (v) => v === null || v === undefined || String(v).trim() === '';

/** Timestamp / Date / ISO 문자열 / ms 숫자를 비교 가능한 ms 로 변환 */
const toMillisLike = (v) => {
  if (v == null) {
    return 0;
  }

  if (typeof v === 'number') {
    return v;
  }

  if (typeof v.toMillis === 'function') {
    return v.toMillis();
  }

  if (v instanceof Date) {
    return v.getTime();
  }

  const parsed = Date.parse(v);

  return Number.isNaN(parsed) ? 0 : parsed;
};

/** 여러 시각 후보 중 가장 최신 값을 원래 타입 그대로 반환 */
const latestValue = (values) =>
  values
    .filter((v) => v != null)
    .reduce((best, v) => (best == null || toMillisLike(v) > toMillisLike(best) ? v : best), null);

const displayName = (d) => d.nameKorean || d.name || '(이름 없음)';

const formatDate = (ms) => {
  if (!ms) {
    return '-';
  }

  const d = new Date(ms);

  return Number.isNaN(d.getTime()) ? '-' : d.toISOString().slice(0, 10);
};

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');

  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

const ensureOutDir = (dir = OUT_DIR) => {
  mkdirSync(dir, { recursive: true });

  return dir;
};

const writeJson = (path, value) => {
  writeFileSync(path, JSON.stringify(value, null, 2));
};

const uniq = (arr) => Array.from(new Set(arr));

const sameArray = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

const sumBy = (arr, fn) => arr.reduce((acc, v) => acc + fn(v), 0);

const pushTo = (map, key, value) => {
  if (!map.has(key)) {
    map.set(key, []);
  }
  map.get(key).push(value);
};

/** createDate(ms) 없으면 admin SDK createTime 폴백 (스펙 §결정 2) */
const createMillis = (snap, data) => {
  const raw = toNum(data.createDate);

  if (raw > 0) {
    return raw;
  }

  return snap?.createTime ? snap.createTime.toMillis() : 0;
};

/** 대량 컬렉션은 stream 으로 순회한다 (메모리·타임아웃 안전) */
const streamQuery = async (query, label, onDoc) => {
  let count = 0;

  await new Promise((resolve, reject) => {
    query
      .stream()
      .on('data', (snap) => {
        count += 1;
        onDoc(snap);

        if (count % 2000 === 0) {
          console.log(`  [${label}] ${count}건 스캔...`);
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`  [${label}] 총 ${count}건`);

  return count;
};

/** users/{uid}/<sub> 만 대상으로 삼기 위한 가드 (동명 컬렉션 오탐 방지) */
const isUserSubDoc = (snap) => {
  const userDoc = snap.ref.parent.parent;

  return !!userDoc && userDoc.parent.id === USERS;
};

const ownerUid = (snap) => snap.ref.parent.parent?.id ?? '';

const pickUserCompareFields = (data) => {
  const out = {};

  USER_COMPARE_FIELDS.forEach((f) => {
    if (data[f] !== undefined) {
      out[f] = typeof data[f] === 'number' ? data[f] : String(data[f] ?? '');
    }
  });

  return out;
};

/** 사용자 복사본 두 개의 차이 필드 목록 (앱에서 직접 수정된 흔적) */
const diffUserFields = (a, b) =>
  USER_COMPARE_FIELDS.filter((f) => {
    const va = a?.[f];
    const vb = b?.[f];

    if (va === undefined && vb === undefined) {
      return false;
    }

    return String(va ?? '') !== String(vb ?? '');
  });

/** 대화형 확인 — --yes 로 생략, 비 TTY 에서는 거부 */
const confirmOrExit = async (message, skip) => {
  if (skip) {
    console.log(`${message}\n  → --yes 지정으로 확인 생략`);

    return;
  }

  if (!process.stdin.isTTY) {
    console.error(`${message}\n  → 비대화형 실행입니다. 확인을 생략하려면 --yes 를 붙이세요.`);
    process.exit(1);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => rl.question(`${message}\n  계속할까요? [y/N] `, resolve));

  rl.close();

  if (!['y', 'yes'].includes(answer.trim().toLowerCase())) {
    console.log('  중단했습니다.');
    process.exit(1);
  }
};

// ── 원자 연산 디스크립터 ───────────────────────────────────────────
// FieldValue 센티널을 직접 payload 에 넣지 않고 디스크립터로 표현한다.
// 로그·dry-run 출력이 읽을 수 있고, 테스트에서 해석 가능하다.
const AtomicOp = Object.freeze({
  arrayUnion: (...values) => ({ __op: 'arrayUnion', values }),
  arrayRemove: (...values) => ({ __op: 'arrayRemove', values }),
  increment: (by) => ({ __op: 'increment', by }),
});

const isAtomicOp = (v) => !!v && typeof v === 'object' && typeof v.__op === 'string';

/** 디스크립터를 실제 FieldValue 센티널로 변환 */
const materializeFieldValues = (data) => {
  if (!data) {
    return data;
  }

  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => {
      if (!isAtomicOp(v)) {
        return [k, v];
      }

      if (v.__op === 'arrayUnion') {
        return [k, FieldValue.arrayUnion(...v.values)];
      }

      if (v.__op === 'arrayRemove') {
        return [k, FieldValue.arrayRemove(...v.values)];
      }

      return [k, FieldValue.increment(v.by)];
    })
  );
};

// ── 백업 직렬화 (Timestamp 등 특수 타입 태깅) ──────────────────────
const isDocumentRef = (v) =>
  !!v && typeof v === 'object' && typeof v.path === 'string' && typeof v.collection === 'function';

const encodeValue = (v) => {
  if (v === null || v === undefined) {
    return null;
  }

  if (Array.isArray(v)) {
    return v.map(encodeValue);
  }

  if (v instanceof Timestamp) {
    return { __type: 'timestamp', seconds: v.seconds, nanoseconds: v.nanoseconds };
  }

  if (v instanceof GeoPoint) {
    return { __type: 'geopoint', latitude: v.latitude, longitude: v.longitude };
  }

  if (v instanceof Date) {
    return { __type: 'date', iso: v.toISOString() };
  }

  if (Buffer.isBuffer(v)) {
    return { __type: 'bytes', base64: v.toString('base64') };
  }

  if (isDocumentRef(v)) {
    return { __type: 'ref', path: v.path };
  }

  if (typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encodeValue(x)]));
  }

  return v;
};

const decodeValue = (v, store) => {
  if (v === null || v === undefined) {
    return null;
  }

  if (Array.isArray(v)) {
    return v.map((x) => decodeValue(x, store));
  }

  if (typeof v !== 'object') {
    return v;
  }

  if (v.__type === 'timestamp') {
    return new Timestamp(v.seconds, v.nanoseconds);
  }

  if (v.__type === 'geopoint') {
    return new GeoPoint(v.latitude, v.longitude);
  }

  if (v.__type === 'date') {
    return new Date(v.iso);
  }

  if (v.__type === 'bytes') {
    return Buffer.from(v.base64, 'base64');
  }

  if (v.__type === 'ref') {
    return store.doc(v.path);
  }

  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, decodeValue(x, store)]));
};

/** NDJSON 스트리밍 기록기 */
const createNdjsonWriter = (path) => {
  const stream = createWriteStream(path, { encoding: 'utf-8' });
  let count = 0;

  return {
    write: (docPath, docId, data) => {
      stream.write(`${JSON.stringify({ path: docPath, docId, data: encodeValue(data) })}\n`);
      count += 1;
    },
    close: () =>
      new Promise((resolve, reject) => {
        stream.once('error', reject);
        stream.end(() => resolve(count));
      }),
    getCount: () => count,
  };
};

/** NDJSON 을 한 줄씩 스트리밍으로 읽어 콜백(async 가능)에 넘긴다 */
const readNdjson = async (path, onRecord) => {
  const rl = createInterface({ input: createReadStream(path, { encoding: 'utf-8' }), crlfDelay: Infinity });
  let count = 0;

  for await (const line of rl) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    await onRecord(JSON.parse(trimmed));
    count += 1;
  }

  return count;
};

// ── PHASE 0: BACKUP ───────────────────────────────────────────────
/** gear-comments/{gearId} 트리(요약 문서 + 댓글 + 대댓글)를 실제 경로 그대로 기록 */
const backupCommentTree = async (parentRef, ndjson) => {
  const parentSnap = await parentRef.get();

  if (parentSnap.exists) {
    ndjson.write(parentRef.path, parentRef.id, parentSnap.data());
  }

  // 필드 없는 팬텀 문서를 놓치지 않도록 listDocuments 로 열거한다.
  const commentRefs = await parentRef.collection(COMMENTS).listDocuments();

  for (const commentRef of commentRefs) {
    const commentSnap = await commentRef.get();

    if (commentSnap.exists) {
      ndjson.write(commentRef.path, commentRef.id, commentSnap.data());
    }

    const replyRefs = await commentRef.collection(COMMENTS).listDocuments();

    for (const replyRef of replyRefs) {
      const replySnap = await replyRef.get();

      if (replySnap.exists) {
        ndjson.write(replyRef.path, replyRef.id, replySnap.data());
      }
    }
  }
};

const runBackup = async () => {
  const store = init();
  const dir = ensureOutDir(join(OUT_DIR, `dedupe-backup-${stamp()}`));

  // plan 이 있으면 dup 범위로 좁혀 덤프한다. 없으면 전량 덤프(안전 우선).
  const plan = existsSync(PLAN_PATH) ? JSON.parse(readFileSync(PLAN_PATH, 'utf-8')) : null;
  const dupIds = new Set(plan ? plan.groups.flatMap((g) => g.dupIds) : []);
  const scoped = (id) => !plan || dupIds.has(id);

  console.log(`[backup] 출력: ${dir}`);
  console.log(
    plan
      ? `[backup] plan 기준 dup ${dupIds.size}건 — gear-comments/comment-likes/feed-content 는 dup 범위만`
      : '[backup] plan 없음 — 전 컬렉션 전량 덤프'
  );

  const manifest = { createdAt: Date.now(), scopedToPlan: !!plan, dupIdCount: dupIds.size, files: {} };

  const dump = async (key, label, query, filter) => {
    const path = join(dir, BACKUP_FILES[key]);
    const ndjson = createNdjsonWriter(path);

    await streamQuery(query, label, (snap) => {
      if (filter && !filter(snap)) {
        return;
      }
      ndjson.write(snap.ref.path, snap.id, snap.data());
    });

    manifest.files[BACKUP_FILES[key]] = await ndjson.close();
  };

  await dump('gear', GEAR, store.collection(GEAR));
  await dump('userGears', 'users/*/gears', store.collectionGroup(USER_GEARS), isUserSubDoc);
  await dump('bag', BAG, store.collection(BAG));
  await dump('bagTemplates', 'users/*/bagTemplates', store.collectionGroup(BAG_TEMPLATES), isUserSubDoc);
  await dump('gearRank', GEAR_RANK, store.collection(GEAR_RANK));
  await dump('gearReview', GEAR_REVIEW, store.collection(GEAR_REVIEW));
  await dump('commentLikes', COMMENT_LIKES, store.collection(COMMENT_LIKES), (snap) =>
    scoped(snap.data().gearId)
  );
  await dump('feedContent', FEED_CONTENT, store.collection(FEED_CONTENT), (snap) =>
    scoped(snap.data().relatedGearId)
  );

  // gear-comments 는 부모 문서가 없어도 서브컬렉션이 존재할 수 있어 listDocuments 로 열거한다.
  const commentsPath = join(dir, BACKUP_FILES.gearComments);
  const commentsNdjson = createNdjsonWriter(commentsPath);
  const commentParents = await store.collection(GEAR_COMMENTS).listDocuments();
  let treeCount = 0;

  for (const ref of commentParents) {
    if (!scoped(ref.id)) {
      continue;
    }
    await backupCommentTree(ref, commentsNdjson);
    treeCount += 1;
  }
  manifest.files[BACKUP_FILES.gearComments] = await commentsNdjson.close();
  console.log(`  [${GEAR_COMMENTS}] 트리 ${treeCount}건 / 문서 ${manifest.files[BACKUP_FILES.gearComments]}건 (전체 부모 ${commentParents.length})`);

  writeJson(join(dir, 'manifest.json'), manifest);

  console.log('\n[backup] 완료 — 문서 수');
  Object.entries(manifest.files).forEach(([f, n]) => console.log(`  ${f}: ${n}`));
  console.log(`\n  ${dir}`);
  console.log(`  복원: node migrate-dedupe.js --restore --from=${dir}`);
};

// ── RESTORE ───────────────────────────────────────────────────────
const runRestore = async (fromDir, only, skipConfirm) => {
  if (!fromDir || !existsSync(fromDir)) {
    console.error(`[restore] 거부 — 백업 디렉토리를 찾을 수 없습니다: ${fromDir ?? '(--from 누락)'}`);
    process.exit(1);
  }

  const files = readdirSync(fromDir).filter((f) => f.endsWith('.ndjson'));
  const targets = only ? files.filter((f) => f === only || basename(f, '.ndjson') === only || BACKUP_FILES[only] === f) : files;

  if (targets.length === 0) {
    console.error(`[restore] 거부 — 복원할 파일이 없습니다 (있는 파일: ${files.join(', ') || '없음'})`);
    process.exit(1);
  }

  await confirmOrExit(
    `[restore] ${fromDir}\n  파일 ${targets.length}개(${targets.join(', ')})를 Firestore 에 그대로 재기록합니다. 현재 데이터를 덮어씁니다.`,
    skipConfirm
  );

  const store = init();
  const writer = createWriter(store, false);
  const result = {};

  for (const file of targets) {
    // 스트리밍으로 읽어 그대로 batch 에 쌓는다 (대형 컬렉션 메모리 보호).
    const n = await readNdjson(join(fromDir, file), async (record) => {
      await writer.enqueue('set', store.doc(record.path), decodeValue(record.data, store));
    });

    await writer.flush();
    result[file] = n;
    console.log(`  [restore] ${file}: ${n}건`);
  }

  console.log(`\n[restore] 완료 — 총 ${Object.values(result).reduce((a, b) => a + b, 0)}건 재기록`);
};

// ── 그룹 정의 (PHASE 1 계산) ───────────────────────────────────────
/** gear 전체 로드 (isCustom 제외) */
const loadGearDocs = async () => {
  const store = init();
  const docs = [];
  let customSkipped = 0;

  const total = await streamQuery(store.collection(GEAR), GEAR, (snap) => {
    const data = snap.data();

    if (data.isCustom) {
      customSkipped += 1;

      return;
    }
    docs.push({ id: snap.id, data, createMs: createMillis(snap, data) });
  });

  console.log(`  isCustom 제외: ${customSkipped}건`);

  return { docs, total, customSkipped };
};

/** 지정한 id 들의 gear 문서만 스캔해 맵으로 (apply 시 그룹 정의 재확인용) */
const scanGearByIds = async (store, idSet) => {
  const map = new Map();

  await streamQuery(store.collection(GEAR), `${GEAR}(재확인)`, (snap) => {
    if (!idSet.has(snap.id)) {
      return;
    }

    const data = snap.data();

    map.set(snap.id, { id: snap.id, data, createMs: createMillis(snap, data) });
  });

  return map;
};

/** 그룹 내 생존자/최신 선정 — createMs 오름차순, 동률 시 id 사전순 */
const sortForGroup = (docs) =>
  [...docs].sort((a, b) => a.createMs - b.createMs || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

/**
 * 스펙 §결정 3 — 필드별로 "최신부터 과거 순 첫 번째 비어있지 않은 값".
 * 최신 문서의 빈 문자열/0 이 생존자의 채워진 값을 덮지 않게 한다.
 */
const buildMergedCatalog = (ordered, canonical, options = {}) => {
  const newestFirst = [...ordered].reverse();
  const merged = {};

  CATALOG_FIELDS.forEach((f) => {
    if (f === 'weight') {
      return;
    }

    const found = newestFirst.find((d) => !isBlank(d.data[f]));

    merged[f] = found ? found.data[f] : '';
  });

  merged.weight = newestFirst.map((d) => toNum(d.data.weight)).find((n) => n > 0) ?? 0;

  // specs 는 오래된 → 최신 순 merge
  merged.specs = ordered.reduce((acc, d) => ({ ...acc, ...(d.data.specs ?? {}) }), {});

  // imageUrl: 생존자 것 우선, 비어있을 때만 최신부터 채움
  // 단 사용자가 "imageUrl 최신" 을 요청한 그룹은 최신 문서의 비어있지 않은 값을 채택한다.
  const latestImage = newestFirst.find((d) => !isBlank(d.data.imageUrl))?.data.imageUrl ?? '';

  merged.imageUrl = options.preferLatestImage || isBlank(canonical.data.imageUrl)
    ? latestImage
    : canonical.data.imageUrl;

  // "<회사명>로 병합해" 지정 (companyKorean 은 기존 규칙 유지)
  if (!isBlank(options.companyOverride)) {
    merged.company = options.companyOverride;
  }

  return merged;
};

/** gears 배열 재작성 — dup → canonical 치환 후, 치환으로 생긴 중복만 제거 */
const rewriteBagGears = (gears, dupSet, canonicalId) => {
  const next = [];
  const removed = [];
  let canonicalSeen = false;

  gears.forEach((gid) => {
    const isTarget = dupSet.has(gid) || gid === canonicalId;

    if (!isTarget) {
      next.push(gid);

      return;
    }

    if (canonicalSeen) {
      removed.push(gid);

      return;
    }
    canonicalSeen = true;
    next.push(canonicalId);
  });

  return { next, removed };
};

/**
 * plan 에 담는 문서 스냅샷.
 * apply 의 "카탈로그 편집 감지"가 이 값과 현재 문서를 비교하므로
 * CATALOG_COMPARE_FIELDS 전체를 빠짐없이 담아야 한다.
 */
const planDocEntry = (d) => ({
  id: d.id,
  createDate: d.createMs,
  company: d.data.company ?? '',
  companyKorean: d.data.companyKorean ?? '',
  name: d.data.name ?? '',
  nameKorean: d.data.nameKorean ?? '',
  color: d.data.color ?? '',
  colorKorean: d.data.colorKorean ?? '',
  size: d.data.size ?? '',
  sizeKorean: d.data.sizeKorean ?? '',
  weight: toNum(d.data.weight),
  imageUrl: d.data.imageUrl ?? '',
  groupId: d.data.groupId ?? '',
  category: d.data.category ?? '',
  productUrl: d.data.productUrl ?? '',
});

/** 유사 중복(수동 검토 목록) 수집 — 자동 병합 그룹 밖의 문서만 대상 */
const findNearDuplicates = (loneDocs) => {
  const result = [];

  const bucket = (keyFn, filter) => {
    const map = new Map();

    loneDocs.forEach((d) => {
      if (filter && !filter(d)) {
        return;
      }
      pushTo(map, keyFn(d.data), d);
    });

    return map;
  };

  // 1) 회사+영문명+색상+사이즈 일치, 한글명 상이
  bucket(englishKey, (d) => !!norm(d.data.name)).forEach((docs, key) => {
    if (docs.length < 2) {
      return;
    }

    if (uniq(docs.map((d) => norm(d.data.nameKorean || d.data.name))).length < 2) {
      return;
    }

    result.push({
      type: NearDuplicateType.EnglishNameMatch,
      key,
      reason: '회사·영문명·색상·사이즈 일치, 한글명 상이',
      docs: docs.map(planDocEntry),
    });
  });

  // 2) 회사+한글명 일치, color/size 가 한쪽만 빈 문자열
  bucket(companyNameKey, (d) => !!companyNameKey(d.data).replace(/\|/g, '')).forEach((docs, key) => {
    if (docs.length < 2) {
      return;
    }

    for (let i = 0; i < docs.length; i += 1) {
      for (let j = i + 1; j < docs.length; j += 1) {
        const a = docs[i].data;
        const b = docs[j].data;
        const emptyDiff = (x, y) => norm(x) !== norm(y) && (norm(x) === '' || norm(y) === '');
        const sameOrEmptyDiff = (x, y) => norm(x) === norm(y) || emptyDiff(x, y);
        const colorEmptyDiff = emptyDiff(a.color, b.color);
        const sizeEmptyDiff = emptyDiff(a.size, b.size);

        if (
          (colorEmptyDiff || sizeEmptyDiff) &&
          sameOrEmptyDiff(a.color, b.color) &&
          sameOrEmptyDiff(a.size, b.size)
        ) {
          result.push({
            type: NearDuplicateType.EmptyVariant,
            key,
            reason: '회사·한글명 일치, 색상/사이즈가 한쪽만 비어 있음',
            docs: [planDocEntry(docs[i]), planDocEntry(docs[j])],
          });
        }
      }
    }
  });

  // 3) groupId+색상+사이즈 일치, 이름 상이
  bucket(groupIdKey, (d) => !!norm(d.data.groupId)).forEach((docs, key) => {
    if (docs.length < 2) {
      return;
    }

    if (uniq(docs.map((d) => norm(d.data.nameKorean || d.data.name))).length < 2) {
      return;
    }

    result.push({
      type: NearDuplicateType.GroupIdMatch,
      key,
      reason: 'groupId·색상·사이즈 일치, 이름 상이',
      docs: docs.map(planDocEntry),
    });
  });

  // 4) 이름+색상+사이즈 일치, 회사 표기만 상이 (예: Nemo vs 니모)
  bucket(nameOnlyKey, (d) => !!norm(d.data.nameKorean || d.data.name)).forEach((docs, key) => {
    if (docs.length < 2) {
      return;
    }

    if (uniq(docs.map((d) => norm(d.data.company))).length < 2) {
      return;
    }

    result.push({
      type: NearDuplicateType.CompanyLabelDiff,
      key,
      reason: '이름·색상·사이즈 일치, 회사 표기만 상이',
      docs: docs.map(planDocEntry),
    });
  });

  return result;
};

/** gear 문서 목록 → 중복 그룹 정의 + 유사중복/이름없음 */
const buildGroups = (docs) => {
  const byKey = new Map();
  const unnamedDocs = [];

  docs.forEach((d) => {
    if (!norm(d.data.nameKorean || d.data.name)) {
      unnamedDocs.push(d);

      return;
    }
    pushTo(byKey, dedupeKey(d.data), d);
  });

  const dupGroups = [];
  const loneDocs = [...unnamedDocs];

  byKey.forEach((members, key) => {
    if (members.length < 2) {
      loneDocs.push(...members);

      return;
    }
    dupGroups.push({ key, members: sortForGroup(members) });
  });

  return { dupGroups, loneDocs, unnamedDocs };
};

/**
 * 승인된 유사 중복 컴포넌트 → 추가 병합 그룹 정의 + 변형 충돌 목록.
 * - 정확 중복 그룹의 dup id 는 그 그룹의 canonical 로 치환 후 중복 제거(하나로 접히면 그룹 미생성).
 * - 변형 충돌 컴포넌트는 병합하지 않고 고아 삭제 후보만 남긴다.
 */
const buildNearDuplicateGroups = (docs, exactDefinitions, feedback) => {
  const docById = new Map(docs.map((d) => [d.id, d]));
  const canonicalByDupId = new Map();

  exactDefinitions.forEach((def) => {
    def.dupIds.forEach((id) => canonicalByDupId.set(id, def.canonicalId));
  });

  const nearDefinitions = [];
  const variantConflicts = [];
  const orphanCandidates = [];
  const skipped = [];

  buildApprovedComponents(feedback).forEach((component) => {
    // 정확 그룹의 dup 은 그 그룹의 생존자로 치환한다(이미 그 문서로 통합될 예정).
    const substituted = uniq(component.ids.map((id) => canonicalByDupId.get(id) ?? id));
    const members = substituted.map((id) => docById.get(id)).filter(Boolean);
    const missing = substituted.filter((id) => !docById.has(id));

    if (substituted.length < 2) {
      skipped.push({
        ids: component.ids,
        reason: '정확 중복 그룹 치환 후 한 문서로 접힘 — 그룹 생성 불필요',
      });

      return;
    }

    if (members.length < 2) {
      skipped.push({
        ids: component.ids,
        reason: `문서를 찾을 수 없음(삭제되었거나 isCustom): ${missing.join(', ')}`,
      });

      return;
    }

    const verdict = judgeVariantConflict(members);

    if (verdict.conflict) {
      const poor = variantPoorDocs(members, verdict.axes);

      variantConflicts.push({
        ids: members.map((d) => d.id),
        axes: verdict.axes,
        colors: verdict.colors,
        sizes: verdict.sizes,
        docs: members.map(planDocEntry),
        variantPoorIds: poor.map((d) => d.id),
      });
      poor.forEach((d) =>
        orphanCandidates.push({
          id: d.id,
          axes: verdict.axes,
          componentIds: members.map((m) => m.id),
          doc: planDocEntry(d),
        })
      );

      return;
    }

    const ordered = sortForGroup(members);
    const canonical = ordered[0];
    const companyOverride = component.memos.map(parseCompanyOverride).find((v) => !isBlank(v)) ?? null;

    nearDefinitions.push({
      // 유사 중복 그룹은 멤버들의 dedupeKey 가 서로 다르므로 별도 키 공간을 쓴다.
      key: `${GroupOrigin.NearDuplicate}:${canonical.id}`,
      canonicalKey: dedupeKey(canonical.data),
      origin: GroupOrigin.NearDuplicate,
      canonicalId: canonical.id,
      dupIds: ordered.slice(1).map((d) => d.id),
      newestId: ordered[ordered.length - 1].id,
      docs: ordered.map(planDocEntry),
      mergedCatalog: buildMergedCatalog(ordered, canonical, { companyOverride }),
      companyOverride,
      categories: verdict.categories,
    });
  });

  return { nearDefinitions, variantConflicts, orphanCandidates, skipped };
};

/** 그룹 정의 목록 → dup/canonical 인덱스 */
const buildGroupIndex = (groups, watchIds = []) => {
  const dupIdSet = new Set();
  const canonicalIdSet = new Set();
  const groupByDupId = new Map();

  groups.forEach((g) => {
    canonicalIdSet.add(g.canonicalId);
    g.dupIds.forEach((id) => {
      dupIdSet.add(id);
      groupByDupId.set(id, g.canonicalId);
    });
  });

  // watchIds: 그룹에 속하지 않지만 참조 수를 세야 하는 문서(고아 삭제 후보)
  const watchIdSet = new Set(watchIds);

  return {
    dupIdSet,
    canonicalIdSet,
    groupByDupId,
    watchIdSet,
    interesting: new Set([...dupIdSet, ...canonicalIdSet, ...watchIdSet]),
  };
};

/** watchIds 문서의 참조 수 집계 틀 */
const emptyRefCount = () => ({
  userDocs: 0,
  bags: 0,
  templates: 0,
  rank: 0,
  review: 0,
  comments: 0,
  likes: 0,
  feed: 0,
});

const totalRefCount = (counts) => (counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0);

const nonZeroRefs = (counts) =>
  Object.entries(counts ?? {})
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}=${n}`);

// ── 참조 스캔 (plan / apply 공용) ──────────────────────────────────
/** bag / bagTemplates 처럼 gears 배열을 가진 문서의 dup 참조를 canonical 별로 정리 */
const collectGearArrayRefs = (data, index, weightLookup, extra) => {
  const gears = Array.isArray(data.gears) ? data.gears : [];
  const hits = gears.filter((gid) => index.dupIdSet.has(gid));

  if (hits.length === 0) {
    return [];
  }

  const byCanonical = new Map();

  hits.forEach((gid) => pushTo(byCanonical, index.groupByDupId.get(gid), gid));

  const out = [];

  byCanonical.forEach((dupIds, cid) => {
    const { removed } = rewriteBagGears(gears, new Set(dupIds), cid);

    out.push({
      canonicalId: cid,
      ref: {
        dupIds: uniq(dupIds),
        hasCanonical: gears.includes(cid),
        coexist: removed.length > 0,
        removedIds: removed,
        weightDelta: sumBy(removed, (gid) => weightLookup(gid)),
        ...extra,
      },
    });
  });

  return out;
};

/**
 * Phase 1 / Phase 2 공용 참조 스캔.
 * apply 는 plan 의 참조 목록을 신뢰하지 않고 이 스캔을 다시 수행한다(스펙 Phase 2 서문).
 */
const scanReferences = async (store, index, globalWeightById) => {
  const userGearsByGearId = new Map(); // gearId -> [{ uid, weight }]
  const userGearDocs = new Map(); // uid -> Map<gearId, { fields, createDate }>

  // 고아 삭제 후보(watchIds)의 참조 수 — 그룹에 속하지 않아 다른 집계에 안 잡힌다.
  const refCountById = new Map();

  index.watchIdSet.forEach((id) => refCountById.set(id, emptyRefCount()));

  const bump = (id, field, by = 1) => {
    const counts = refCountById.get(id);

    if (counts) {
      counts[field] += by;
    }
  };
  const watchedIn = (ids) => ids.filter((id) => index.watchIdSet.has(id));

  console.log('  users/*/gears 스캔...');
  await streamQuery(store.collectionGroup(USER_GEARS), 'users/*/gears', (snap) => {
    if (!isUserSubDoc(snap) || !index.interesting.has(snap.id)) {
      return;
    }

    const uid = ownerUid(snap);
    const data = snap.data();

    pushTo(userGearsByGearId, snap.id, { uid, weight: toNum(data.weight) });
    bump(snap.id, 'userDocs');

    if (!userGearDocs.has(uid)) {
      userGearDocs.set(uid, new Map());
    }
    userGearDocs.get(uid).set(snap.id, {
      fields: pickUserCompareFields(data),
      createDate: toNum(data.createDate),
    });
  });

  // 스펙 §결정 5 — 사용자 복사본이 존재하면 0 이어도 그 값, 없을 때만 전역 폴백
  const weightFor = (uid) => (gid) => {
    const owned = (userGearsByGearId.get(gid) ?? []).find((e) => e.uid === uid);

    if (owned) {
      return owned.weight;
    }

    return globalWeightById.get(gid) ?? 0;
  };

  console.log('  bag 스캔...');

  const bagsByCanonical = new Map();

  await streamQuery(store.collection(BAG), BAG, (snap) => {
    const data = snap.data();
    const uid = data.userId ?? '';

    watchedIn(Array.isArray(data.gears) ? data.gears : []).forEach((id) => bump(id, 'bags'));

    collectGearArrayRefs(data, index, weightFor(uid), {
      bagId: snap.id,
      uid,
      bagName: data.name ?? '',
      bagWeight: toNum(data.weight),
    }).forEach(({ canonicalId, ref }) => pushTo(bagsByCanonical, canonicalId, ref));
  });

  console.log('  users/*/bagTemplates 스캔...');

  const templatesByCanonical = new Map();

  await streamQuery(store.collectionGroup(BAG_TEMPLATES), 'users/*/bagTemplates', (snap) => {
    if (!isUserSubDoc(snap)) {
      return;
    }

    const data = snap.data();
    const uid = ownerUid(snap);

    watchedIn(Array.isArray(data.gears) ? data.gears : []).forEach((id) => bump(id, 'templates'));

    collectGearArrayRefs(data, index, weightFor(uid), {
      templateId: snap.id,
      uid,
      templateName: data.name ?? '',
      templateWeight: toNum(data.weight),
    }).forEach(({ canonicalId, ref }) => pushTo(templatesByCanonical, canonicalId, ref));
  });

  console.log('  gear-rank 스캔...');

  const rankById = new Map();

  await streamQuery(store.collection(GEAR_RANK), GEAR_RANK, (snap) => {
    if (!index.interesting.has(snap.id)) {
      return;
    }

    const data = snap.data();

    bump(snap.id, 'rank');
    rankById.set(snap.id, {
      count: toNum(data.count),
      category: data.category ?? '',
      updatedAt: toMillisLike(data.updatedAt),
    });
  });

  console.log('  gear-review 스캔...');

  const reviewIds = new Set();

  await streamQuery(store.collection(GEAR_REVIEW), GEAR_REVIEW, (snap) => {
    if (index.interesting.has(snap.id)) {
      bump(snap.id, 'review');
      reviewIds.add(snap.id);
    }
  });

  console.log('  comment-likes 스캔...');

  const likeCountByGearId = new Map();

  await streamQuery(store.collection(COMMENT_LIKES), COMMENT_LIKES, (snap) => {
    const gid = snap.data().gearId;

    bump(gid, 'likes');

    if (index.dupIdSet.has(gid)) {
      likeCountByGearId.set(gid, (likeCountByGearId.get(gid) ?? 0) + 1);
    }
  });

  console.log('  feed-content 스캔...');

  const feedByCanonical = new Map();

  await streamQuery(store.collection(FEED_CONTENT), FEED_CONTENT, (snap) => {
    const data = snap.data();
    const gid = data.relatedGearId;

    bump(gid, 'feed');

    if (!index.dupIdSet.has(gid)) {
      return;
    }

    pushTo(feedByCanonical, index.groupByDupId.get(gid), {
      docId: snap.id,
      dupId: gid,
      title: data.title ?? '',
      type: data.type ?? '',
    });
  });

  console.log('  gear-comments 스캔...');

  const commentInfoById = new Map();
  const commentParents = await store.collection(GEAR_COMMENTS).listDocuments();

  for (const ref of commentParents) {
    if (!index.dupIdSet.has(ref.id) && !index.watchIdSet.has(ref.id)) {
      continue;
    }

    const summarySnap = await ref.get();
    const commentRefs = await ref.collection(COMMENTS).listDocuments();
    let replyCount = 0;

    for (const commentRef of commentRefs) {
      replyCount += (await commentRef.collection(COMMENTS).listDocuments()).length;
    }

    if (!summarySnap.exists && commentRefs.length === 0) {
      continue;
    }

    bump(ref.id, 'comments', (summarySnap.exists ? 1 : 0) + commentRefs.length + replyCount);
    commentInfoById.set(ref.id, {
      hasSummary: summarySnap.exists,
      commentCount: commentRefs.length,
      replyCount,
    });
  }
  console.log(`  [${GEAR_COMMENTS}] dup 트리 ${commentInfoById.size}건 (전체 부모 ${commentParents.length})`);

  return {
    refCountById,
    userGearsByGearId,
    userGearDocs,
    bagsByCanonical,
    templatesByCanonical,
    rankById,
    reviewIds,
    likeCountByGearId,
    feedByCanonical,
    commentInfoById,
  };
};

/**
 * 사용자 복사본 충돌 판정.
 * - canonical 복사본 보유: canonical 과 각 dup 비교 (apply 는 canonical 을 유지)
 * - canonical 없이 dup 2개 이상 보유: apply 의 베이스(가장 오래된 dup)와 나머지 비교
 */
const detectUserConflicts = (group, userDocs, scan) => {
  const byUid = new Map();

  userDocs.forEach((u) => pushTo(byUid, u.uid, u));

  const conflicts = [];

  byUid.forEach((entries, uid) => {
    const owned = scan.userGearDocs.get(uid);

    if (!owned) {
      return;
    }

    const canonicalDoc = owned.get(group.canonicalId);

    if (canonicalDoc) {
      entries.forEach((u) => {
        const diffFields = diffUserFields(canonicalDoc.fields, owned.get(u.gearId)?.fields);

        if (diffFields.length) {
          conflicts.push({ uid, gearId: u.gearId, diffFields, comparedWith: group.canonicalId });
        }
      });

      return;
    }

    if (entries.length < 2) {
      return;
    }

    // apply 와 동일 규칙으로 베이스 선정: createDate 최소, 동률 시 id 사전순
    const base = [...entries].sort((a, b) => {
      const ca = owned.get(a.gearId)?.createDate ?? 0;
      const cb = owned.get(b.gearId)?.createDate ?? 0;

      return ca - cb || (a.gearId < b.gearId ? -1 : a.gearId > b.gearId ? 1 : 0);
    })[0];

    entries
      .filter((u) => u.gearId !== base.gearId)
      .forEach((u) => {
        const diffFields = diffUserFields(owned.get(base.gearId)?.fields, owned.get(u.gearId)?.fields);

        if (diffFields.length) {
          conflicts.push({ uid, gearId: u.gearId, diffFields, comparedWith: base.gearId });
        }
      });
  });

  return conflicts;
};

/** 그룹 하나에 대한 참조 목록 조립 (plan 산출·apply 실행 공용) */
const buildGroupRefs = (group, scan) => {
  const canonicalId = group.canonicalId;
  const userDocs = group.dupIds.flatMap((gid) =>
    (scan.userGearsByGearId.get(gid) ?? []).map((e) => {
      const owned = scan.userGearDocs.get(e.uid);
      const canonicalDoc = owned?.get(canonicalId);
      const hasCanonical = !!canonicalDoc;

      return {
        uid: e.uid,
        gearId: gid,
        weight: e.weight,
        hasCanonical,
        // 앱에서 사용자가 직접 수정했을 수 있어 차이 필드를 표기한다(수동 판단용).
        diffFields: hasCanonical ? diffUserFields(canonicalDoc.fields, owned.get(gid)?.fields) : [],
      };
    })
  );
  const bagRefs = scan.bagsByCanonical.get(canonicalId) ?? [];
  const templateRefs = scan.templatesByCanonical.get(canonicalId) ?? [];

  return {
    userDocs,
    conflictUserDocs: detectUserConflicts(group, userDocs, scan),
    bagRefs,
    coexistBags: bagRefs.filter((b) => b.coexist).map((b) => b.bagId),
    templateRefs,
    coexistTemplates: templateRefs.filter((t) => t.coexist).map((t) => t.templateId),
    rankRefs: group.dupIds
      .filter((gid) => scan.rankById.has(gid))
      .map((gid) => ({ dupId: gid, ...scan.rankById.get(gid) })),
    canonicalRank: scan.rankById.get(canonicalId) ?? null,
    reviewRefs: group.dupIds.filter((gid) => scan.reviewIds.has(gid)).map((gid) => ({ dupId: gid })),
    canonicalReviewExists: scan.reviewIds.has(canonicalId),
    commentRefs: group.dupIds
      .filter((gid) => scan.commentInfoById.has(gid))
      .map((gid) => ({ dupId: gid, ...scan.commentInfoById.get(gid) })),
    commentLikeRefs: group.dupIds
      .filter((gid) => scan.likeCountByGearId.has(gid))
      .map((gid) => ({ dupId: gid, count: scan.likeCountByGearId.get(gid) })),
    feedRefs: (scan.feedByCanonical.get(canonicalId) ?? []).filter((f) => group.dupIds.includes(f.dupId)),
  };
};

const countRefs = (groups) => ({
  userDocs: sumBy(groups, (g) => g.userDocs.length),
  conflictUserDocs: sumBy(groups, (g) => g.conflictUserDocs.length),
  affectedUsers: uniq(groups.flatMap((g) => g.userDocs.map((u) => u.uid))).length,
  bags: uniq(groups.flatMap((g) => g.bagRefs.map((b) => b.bagId))).length,
  coexistBags: uniq(groups.flatMap((g) => g.coexistBags)).length,
  templates: uniq(groups.flatMap((g) => g.templateRefs.map((t) => `${t.uid}/${t.templateId}`))).length,
  coexistTemplates: uniq(groups.flatMap((g) => g.coexistTemplates)).length,
  rankDocs: sumBy(groups, (g) => g.rankRefs.length),
  reviewDocs: sumBy(groups, (g) => g.reviewRefs.length),
  commentTrees: sumBy(groups, (g) => g.commentRefs.length),
  commentDocs: sumBy(groups, (g) => sumBy(g.commentRefs, (c) => c.commentCount + c.replyCount)),
  commentLikes: sumBy(groups, (g) => sumBy(g.commentLikeRefs, (c) => c.count)),
  feedDocs: sumBy(groups, (g) => g.feedRefs.length),
});

// ── PHASE 1: PLAN ─────────────────────────────────────────────────
const runPlan = async () => {
  const store = init();

  ensureOutDir();
  console.log('[plan] gear 스캔...');

  const { docs, total } = await loadGearDocs();
  const { dupGroups, loneDocs, unnamedDocs } = buildGroups(docs);

  console.log(`[plan] 중복 그룹 ${dupGroups.length}개 / 이름 없음 ${unnamedDocs.length}건`);

  // 이전 라운드의 피드백(있으면)을 읽어 그룹별 메모 규칙과 유사 중복 병합 승인을 반영한다.
  const { feedback, error: feedbackError } = loadFeedback();

  if (feedbackError) {
    console.error(`[plan] 거부 — 피드백 파일을 읽을 수 없습니다: ${feedbackError}`);
    console.error(`  ${FEEDBACK_PATH} 를 고치거나 삭제한 뒤 다시 실행하세요.`);
    process.exit(1);
  }

  const latestImageKeys = new Set(
    Object.entries(feedback?.groups ?? {})
      .filter(([, v]) => wantsLatestImage(v.memo))
      .map(([key]) => key)
  );

  const definitions = dupGroups.map(({ key, members }) => ({
    key,
    canonicalKey: key,
    origin: GroupOrigin.Exact,
    canonicalId: members[0].id,
    dupIds: members.slice(1).map((m) => m.id),
    newestId: members[members.length - 1].id,
    docs: members.map(planDocEntry),
    mergedCatalog: buildMergedCatalog(members, members[0], {
      preferLatestImage: latestImageKeys.has(key),
    }),
    preferLatestImage: latestImageKeys.has(key),
  }));

  // Phase 1.5 — 사용자가 병합 승인한 유사 중복 컴포넌트를 추가 그룹으로
  const near = buildNearDuplicateGroups(docs, definitions, feedback);

  if (feedback) {
    console.log(
      `[plan] 피드백 반영 — 유사중복 병합 승인 그룹 ${near.nearDefinitions.length}개 / 변형 충돌 ${near.variantConflicts.length}건 / 고아 삭제 후보 ${near.orphanCandidates.length}건 / imageUrl 최신 지정 ${latestImageKeys.size}건`
    );
    near.skipped.forEach((s) => console.log(`  [near skip] ${s.ids.join('+')} — ${s.reason}`));
  }

  const allDefinitions = [...definitions, ...near.nearDefinitions];
  const orphanIds = near.orphanCandidates.map((c) => c.id);
  const index = buildGroupIndex(allDefinitions, orphanIds);
  const globalWeightById = new Map(docs.map((d) => [d.id, toNum(d.data.weight)]));

  console.log('[plan] 참조 스캔...');

  const scan = await scanReferences(store, index, globalWeightById);
  const groups = allDefinitions.map((def) => ({ ...def, ...buildGroupRefs(def, scan) }));

  // 고아 삭제: 참조가 0인 후보만 실제 삭제 목록에 올린다(apply 가 다시 확인).
  const orphanDeletes = near.orphanCandidates.map((candidate) => {
    const counts = scan.refCountById.get(candidate.id) ?? emptyRefCount();

    return {
      ...candidate,
      refCounts: counts,
      totalRefs: totalRefCount(counts),
      eligible: totalRefCount(counts) === 0,
    };
  });

  const plan = {
    planVersion: PLAN_VERSION,
    generatedAt: Date.now(),
    totalGearDocs: total,
    groupCount: groups.length,
    exactGroupCount: definitions.length,
    nearGroupCount: near.nearDefinitions.length,
    dupDocCount: sumBy(groups, (g) => g.dupIds.length),
    refCounts: countRefs(groups),
    groups,
    variantConflicts: near.variantConflicts,
    orphanDeletes,
    nearSkipped: near.skipped,
    nearDuplicates: findNearDuplicates(loneDocs),
    unnamed: unnamedDocs.map(planDocEntry),
  };

  writeJson(PLAN_PATH, plan);
  writeFileSync(REPORT_PATH, renderReport(plan));

  const r = plan.refCounts;

  console.log('\n[plan] 완료');
  console.log(`  전체 gear 문서: ${plan.totalGearDocs}`);
  console.log(
    `  중복 그룹: ${plan.groupCount} (정확 ${plan.exactGroupCount} + 유사중복 승인 ${plan.nearGroupCount}) / 삭제 예정 문서: ${plan.dupDocCount}`
  );
  console.log(
    `  변형 충돌: ${plan.variantConflicts.length}건 / 고아 삭제 예정: ${plan.orphanDeletes.filter((o) => o.eligible).length}건 (보류 ${plan.orphanDeletes.filter((o) => !o.eligible).length})`
  );
  console.log(`  창고 이동: ${r.userDocs} (사용자 ${r.affectedUsers}, 충돌 ${r.conflictUserDocs})`);
  console.log(`  가방: ${r.bags} (weight 차감 ${r.coexistBags}) / 템플릿: ${r.templates} (weight 차감 ${r.coexistTemplates})`);
  console.log(`  gear-rank ${r.rankDocs} / gear-review ${r.reviewDocs} / 댓글 트리 ${r.commentTrees}(문서 ${r.commentDocs}) / 좋아요 ${r.commentLikes} / feed-content ${r.feedDocs}`);
  console.log(`  유사 중복(수동 검토): ${plan.nearDuplicates.length} / 이름 없음: ${plan.unnamed.length}`);
  console.log(`\n  ${PLAN_PATH}`);
  console.log(`  file://${REPORT_PATH}`);
  console.log('\n  ※ apply 는 이 plan 의 그룹 정의만 사용하고 참조는 실행 시점에 재스캔합니다.');
};

// ── PHASE 1.5: 리포트 피드백 ───────────────────────────────────────
/** 유사 중복 항목의 안정적 식별자 — 유형 + 문서 id 조합 (렌더/파일 공용) */
const nearDuplicateKey = (nd) => `${nd.type}:${nd.docs.map((d) => d.id).join('+')}`;

/** 사용자 복사본 충돌 행의 안정적 식별자 (렌더/파일 공용) */
const conflictKey = (row) => `${row.canonicalId}:${row.uid}:${row.gearId}`;

/** 피드백 파일 형식 검증 — 서버 저장 시점과 apply 로드 시점에 공용 */
const validateFeedback = (fb) => {
  if (!fb || typeof fb !== 'object' || Array.isArray(fb)) {
    return '형식이 올바르지 않습니다(객체가 아님)';
  }

  if (typeof fb.planGeneratedAt !== 'number' || !Number.isFinite(fb.planGeneratedAt)) {
    return 'planGeneratedAt(숫자)이 없습니다';
  }

  const decisions = Object.values(FeedbackDecision);

  for (const [key, value] of Object.entries(fb.groups ?? {})) {
    if (!value || typeof value !== 'object') {
      return `groups["${key}"] 형식 오류`;
    }

    if (!decisions.includes(value.decision)) {
      return `groups["${key}"].decision 은 ${decisions.join('|')} 중 하나여야 합니다`;
    }

    if (value.memo != null && typeof value.memo !== 'string') {
      return `groups["${key}"].memo 는 문자열이어야 합니다`;
    }
  }

  for (const section of ['nearDuplicates', 'conflicts']) {
    for (const [key, value] of Object.entries(fb[section] ?? {})) {
      if (typeof value !== 'string') {
        return `${section}["${key}"] 는 문자열이어야 합니다`;
      }
    }
  }

  return null;
};

// ── 유사 중복 병합 승인 (사용자 피드백 기반) ────────────────────────
/** 메모가 병합 승인인지 */
const isMergeApproval = (memo) => MERGE_APPROVAL_PATTERN.test(memo ?? '');

/** "<회사명>로 병합해" → 회사명 (없으면 null) */
const parseCompanyOverride = (memo) => {
  const matched = COMPANY_OVERRIDE_PATTERN.exec((memo ?? '').trim());

  return matched ? matched[1].trim() : null;
};

/** 그룹 메모가 "imageUrl 을 최신값으로" 요청하는지 */
const wantsLatestImage = (memo) => {
  const text = memo ?? '';

  return text.includes('imageUrl') && text.includes('최신');
};

/** 유사 중복 키("type:idA+idB[+idC]") → 문서 id 목록 */
const parseNearDuplicateKey = (key) => {
  const separator = key.indexOf(':');

  if (separator === -1) {
    return [];
  }

  return key
    .slice(separator + 1)
    .split('+')
    .map((id) => id.trim())
    .filter(Boolean);
};

/** union-find 로 승인 쌍들을 컴포넌트(연결 요소)로 묶는다 */
const buildApprovedComponents = (feedback) => {
  const parent = new Map();
  const find = (id) => {
    if (!parent.has(id)) {
      parent.set(id, id);
    }

    let root = id;

    while (parent.get(root) !== root) {
      root = parent.get(root);
    }

    // 경로 압축
    let cursor = id;

    while (parent.get(cursor) !== root) {
      const next = parent.get(cursor);

      parent.set(cursor, root);
      cursor = next;
    }

    return root;
  };
  const union = (a, b) => {
    const rootA = find(a);
    const rootB = find(b);

    if (rootA !== rootB) {
      parent.set(rootB, rootA);
    }
  };
  const approvedKeys = [];

  Object.entries(feedback?.nearDuplicates ?? {}).forEach(([key, memo]) => {
    if (!isMergeApproval(memo)) {
      return;
    }

    const ids = parseNearDuplicateKey(key);

    if (ids.length < 2) {
      return;
    }

    approvedKeys.push({ key, memo, ids });
    ids.slice(1).forEach((id) => union(ids[0], id));
  });

  const byRoot = new Map();

  approvedKeys.forEach(({ ids }) => {
    ids.forEach((id) => {
      const root = find(id);

      if (!byRoot.has(root)) {
        byRoot.set(root, new Set());
      }
      byRoot.get(root).add(id);
    });
  });

  return [...byRoot.values()].map((set) => {
    const ids = [...set];
    // 이 컴포넌트에 기여한 승인 메모들 (회사명 지정 탐색용)
    const memos = approvedKeys.filter((entry) => entry.ids.some((id) => set.has(id))).map((e) => e.memo);

    return { ids, memos };
  });
};

/**
 * 변형 충돌 판정 — 비어있지 않은 color 가 2종 이상이거나 size 가 2종 이상이면
 * 서로 다른 변형이 섞인 것이므로 병합하지 않는다. 카테고리 상이는 허용.
 */
const judgeVariantConflict = (docs) => {
  const distinct = (field) => uniq(docs.map((d) => norm(d.data[field])).filter((v) => v !== ''));
  const colors = distinct('color');
  const sizes = distinct('size');
  const axes = [];

  if (colors.length >= 2) {
    axes.push('color');
  }

  if (sizes.length >= 2) {
    axes.push('size');
  }

  return {
    conflict: axes.length > 0,
    axes,
    colors,
    sizes,
    categories: uniq(docs.map((d) => norm(d.data.category)).filter((v) => v !== '')),
  };
};

/** 충돌 컴포넌트에서 변형 정보가 부족해 어느 변형인지 특정 불가한 문서 */
const variantPoorDocs = (docs, axes) => docs.filter((d) => axes.some((axis) => norm(d.data[axis]) === ''));

/** 제외 결정된 그룹 키 집합 */
const excludedGroupKeys = (feedback) =>
  new Set(
    Object.entries(feedback?.groups ?? {})
      .filter(([, v]) => v.decision === FeedbackDecision.Exclude)
      .map(([key]) => key)
  );

const countMemos = (feedback) =>
  Object.values(feedback?.groups ?? {}).filter((v) => (v.memo ?? '').trim()).length +
  Object.values(feedback?.nearDuplicates ?? {}).filter((v) => v.trim()).length +
  Object.values(feedback?.conflicts ?? {}).filter((v) => v.trim()).length;

/** apply 가 사용할 피드백 로드 — 불량 파일은 조용히 무시하지 않고 오류로 알린다 */
const loadFeedback = (path = FEEDBACK_PATH) => {
  if (!existsSync(path)) {
    return { feedback: null, error: null };
  }

  let parsed;

  try {
    parsed = JSON.parse(readFileSync(path, 'utf-8'));
  } catch (e) {
    return { feedback: null, error: `JSON 파싱 실패: ${e.message}` };
  }

  const invalid = validateFeedback(parsed);

  if (invalid) {
    return { feedback: null, error: invalid };
  }

  return { feedback: parsed, error: null };
};

/** 피드백 제외 그룹의 로그 항목 — 참조를 건드리지 않았음을 verify 가 알 수 있게 표시한다 */
const createExcludedLog = (group, feedback) => {
  const log = createGroupLog(group);

  log.excludedByFeedback = true;
  log.notApplied = '리포트 피드백에서 제외로 표시됨';
  log.memo = feedback?.groups?.[group.key]?.memo ?? '';
  log.skipped.push(log.notApplied);

  return log;
};

const runFeedbackServer = async () => {
  ensureOutDir();

  const server = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();

      return;
    }

    const route = (req.url ?? '').split('?')[0];

    if (route !== FEEDBACK_ROUTE) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));

      return;
    }

    if (req.method === 'GET') {
      if (!existsSync(FEEDBACK_PATH)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '저장된 피드백이 없습니다' }));

        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(readFileSync(FEEDBACK_PATH, 'utf-8'));

      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));

      return;
    }

    let body = '';
    let aborted = false;

    req.on('data', (chunk) => {
      if (aborted) {
        return;
      }
      body += chunk;

      if (body.length > FEEDBACK_BODY_LIMIT) {
        aborted = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '본문이 너무 큽니다' }));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (aborted) {
        return;
      }

      res.setHeader('Content-Type', 'application/json');

      try {
        const parsed = JSON.parse(body);
        const invalid = validateFeedback(parsed);

        if (invalid) {
          console.error(`[feedback] 거부: ${invalid}`);
          res.writeHead(400);
          res.end(JSON.stringify({ error: invalid }));

          return;
        }

        const saved = { ...parsed, savedAt: Date.now() };

        writeJson(FEEDBACK_PATH, saved);

        const excluded = excludedGroupKeys(saved).size;

        console.log(`[feedback] 저장 — 제외 ${excluded}건 / 메모 ${countMemos(saved)}건 → ${FEEDBACK_PATH}`);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, savedAt: saved.savedAt, excluded, memos: countMemos(saved) }));
      } catch (e) {
        console.error(`[feedback] 오류: ${e.message}`);
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  });

  await new Promise((resolve, reject) => {
    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        console.error(`포트 ${FEEDBACK_PORT} 이미 사용 중입니다. 기존 피드백 서버가 실행 중인지 확인하세요.`);
      }
      reject(e);
    });
    server.on('close', resolve);
    server.listen(FEEDBACK_PORT, '127.0.0.1', () => {
      console.log(`[feedback 서버] http://localhost:${FEEDBACK_PORT}${FEEDBACK_ROUTE} 대기 중 (Ctrl+C 종료)`);
      console.log(`  저장 위치: ${FEEDBACK_PATH}`);
      console.log(`  리포트: file://${REPORT_PATH}`);
    });
  });
};

/** Firestore 접속 없이 기존 plan 으로 리포트만 재생성 */
const runRender = () => {
  if (!existsSync(PLAN_PATH)) {
    console.error(`[render] 거부 — plan 파일이 없습니다: ${PLAN_PATH}`);
    console.error('  먼저 --plan 을 실행하세요.');
    process.exit(1);
  }

  let plan;

  try {
    plan = JSON.parse(readFileSync(PLAN_PATH, 'utf-8'));
  } catch (e) {
    console.error(`[render] 거부 — plan JSON 파싱 실패: ${e.message}`);
    process.exit(1);
  }

  if (!plan || !Array.isArray(plan.groups)) {
    console.error('[render] 거부 — plan 에 groups 배열이 없습니다.');
    process.exit(1);
  }

  if (plan.planVersion !== PLAN_VERSION) {
    console.log(`[render] 경고 — planVersion=${plan.planVersion ?? '없음'} (현재 ${PLAN_VERSION}). 렌더만 수행합니다.`);
  }

  ensureOutDir();
  writeFileSync(REPORT_PATH, renderReport(plan));

  console.log(`[render] 완료 — 그룹 ${plan.groups.length}개`);
  console.log(`  file://${REPORT_PATH}`);
  console.log(`  피드백을 남기려면: node migrate-dedupe.js --feedback-server`);
};

// ── HTML 리포트 ────────────────────────────────────────────────────
const renderDocCard = (group, doc) => {
  const isCanonical = doc.id === group.canonicalId;
  // 한 사용자가 dup 을 여럿 보유할 수 있어 생존자 참조 수는 uid 기준으로 중복 제거한다.
  const userRefs = isCanonical
    ? uniq(group.userDocs.filter((u) => u.hasCanonical).map((u) => u.uid)).length
    : group.userDocs.filter((u) => u.gearId === doc.id).length;
  const bagRefs = isCanonical
    ? uniq(group.bagRefs.filter((b) => b.hasCanonical).map((b) => b.bagId)).length
    : group.bagRefs.filter((b) => b.dupIds.includes(doc.id)).length;
  const tplRefs = isCanonical
    ? uniq(group.templateRefs.filter((t) => t.hasCanonical).map((t) => `${t.uid}/${t.templateId}`)).length
    : group.templateRefs.filter((t) => t.dupIds.includes(doc.id)).length;

  return `
  <div class="doc ${isCanonical ? 'keep' : 'del'}">
    <div class="thumb">${
      doc.imageUrl
        ? `<img src="${esc(doc.imageUrl)}" loading="lazy" alt="">`
        : '<span class="noimg">이미지 없음</span>'
    }</div>
    <div class="meta">
      <div class="badges">
        <span class="badge ${isCanonical ? 'b-keep' : 'b-del'}">${isCanonical ? '생존 KEEP' : '삭제 DELETE'}</span>
        ${doc.id === group.newestId ? '<span class="badge b-new">최신 데이터</span>' : ''}
      </div>
      <div class="nm">${esc(displayName(doc))}</div>
      <div class="sub">${esc(doc.name || '-')}</div>
      <dl>
        <div><dt>색상</dt><dd>${esc(doc.color || '-')}</dd></div>
        <div><dt>사이즈</dt><dd>${esc(doc.size || '-')}</dd></div>
        <div><dt>무게</dt><dd>${doc.weight ? `${doc.weight} g` : '-'}</dd></div>
        <div><dt>생성일</dt><dd>${formatDate(doc.createDate)}</dd></div>
        <div><dt>카테고리</dt><dd>${esc(doc.category || '-')}</dd></div>
        <div><dt>groupId</dt><dd>${esc(doc.groupId || '-')}</dd></div>
        <div><dt>창고 참조</dt><dd>${userRefs}</dd></div>
        <div><dt>가방 참조</dt><dd>${bagRefs}</dd></div>
        <div><dt>템플릿 참조</dt><dd>${tplRefs}</dd></div>
      </dl>
      <div class="id">${esc(doc.id)}</div>
    </div>
  </div>`;
};

const renderRefList = (title, items) => {
  if (!items.length) {
    return '';
  }

  return `<div class="refs"><h4>${esc(title)} (${items.length}건)</h4><ul>${items.map((li) => `<li>${li}</li>`).join('')}</ul></div>`;
};

/** Phase 1.5 — 그룹 카드의 승인/제외 토글 + 메모 */
const renderGroupFeedback = (group, index) => `
    <div class="fb" data-fb-kind="group" data-fb-key="${esc(group.key)}">
      <div class="fb-row">
        <span class="fb-lbl">검토</span>
        <label class="fb-opt"><input type="radio" name="fb-g${index}" value="${FeedbackDecision.Approve}" checked> 병합 승인</label>
        <label class="fb-opt fb-ex"><input type="radio" name="fb-g${index}" value="${FeedbackDecision.Exclude}"> 제외(이 그룹은 apply 안 함)</label>
        <span class="fb-state" data-fb-badge></span>
      </div>
      <textarea data-fb-memo rows="2" placeholder="메모 (선택) — 왜 제외인지, 무엇을 확인해야 하는지"></textarea>
    </div>`;

/** Phase 1.5 — 메모 전용 입력 (유사 중복 / 충돌) */
const renderMemoOnly = (kind, key, placeholder) => `
    <div class="fb" data-fb-kind="${kind}" data-fb-key="${esc(key)}">
      <textarea data-fb-memo rows="2" placeholder="${esc(placeholder)}"></textarea>
    </div>`;

const renderGroupCard = (group, index) => {
  const c = group.mergedCatalog;
  const appRefs = [];

  if (group.rankRefs.length) {
    appRefs.push(
      `gear-rank ${group.rankRefs.length}건 · count 합산 +${sumBy(group.rankRefs, (x) => x.count)}${
        group.canonicalRank ? ` (생존자 현재 ${group.canonicalRank.count})` : ' (생존자 문서 없음 → 생성, id 필드 교체)'
      }`
    );
  }

  if (group.reviewRefs.length) {
    appRefs.push(
      `gear-review ${group.reviewRefs.length}건 · ${group.canonicalReviewExists ? '생존자 유지' : '생존자 없음 → dup 복사'}`
    );
  }

  if (group.commentRefs.length) {
    appRefs.push(
      `gear-comments 트리 ${group.commentRefs.length}건 · 댓글 ${sumBy(group.commentRefs, (x) => x.commentCount)} / 대댓글 ${sumBy(group.commentRefs, (x) => x.replyCount)} · 요약 카운터 병합`
    );
  }

  if (group.commentLikeRefs.length) {
    appRefs.push(`comment-likes ${sumBy(group.commentLikeRefs, (x) => x.count)}건 · gearId 갱신`);
  }

  if (group.feedRefs.length) {
    appRefs.push(
      `feed-content ${group.feedRefs.length}건 · relatedGearId 갱신 (${group.feedRefs.map((f) => esc(f.title || f.docId)).join(', ')})`
    );
  }

  return `
  <section class="group">
    <header>
      <h3>${esc(displayName(group.docs.find((d) => d.id === group.newestId) ?? group.docs[0]))}</h3>
      ${
        group.origin === GroupOrigin.NearDuplicate
          ? '<span class="badge b-near">유사중복 승인</span>'
          : '<span class="badge b-exact">정확 중복</span>'
      }
      <span class="cnt">문서 ${group.docs.length}개 · 삭제 ${group.dupIds.length}개</span>
      ${group.companyOverride ? `<span class="badge b-warn">회사명 지정: ${esc(group.companyOverride)}</span>` : ''}
      ${group.preferLatestImage ? '<span class="badge b-new">imageUrl 최신 지정</span>' : ''}
      ${
        (group.categories ?? []).length > 1
          ? `<span class="badge b-warn">카테고리 상이: ${esc(group.categories.join(', '))}</span>`
          : ''
      }
      <code class="key">${esc(group.key)}</code>
    </header>
    <div class="docs">${group.docs.map((d) => renderDocCard(group, d)).join('')}</div>
    <div class="merged">
      <h4>병합 결과 미리보기 (생존자에 기록될 카탈로그 — 필드별 최신 비어있지 않은 값)</h4>
      <dl>
        <div><dt>회사</dt><dd>${esc(c.company)} / ${esc(c.companyKorean || '-')}</dd></div>
        <div><dt>제품명</dt><dd>${esc(c.nameKorean || '-')} / ${esc(c.name || '-')}</dd></div>
        <div><dt>색상</dt><dd>${esc(c.color || '-')} / ${esc(c.colorKorean || '-')}</dd></div>
        <div><dt>사이즈</dt><dd>${esc(c.size || '-')} / ${esc(c.sizeKorean || '-')}</dd></div>
        <div><dt>무게</dt><dd>${c.weight ? `${c.weight} g` : '-'}</dd></div>
        <div><dt>카테고리</dt><dd>${esc(c.category || '-')}</dd></div>
        <div><dt>groupId</dt><dd>${esc(c.groupId || '-')}</dd></div>
        <div><dt>imageUrl</dt><dd class="url">${esc(c.imageUrl || '-')}</dd></div>
        <div><dt>specs</dt><dd>${esc(Object.keys(c.specs ?? {}).join(', ') || '-')}</dd></div>
      </dl>
    </div>
    ${renderRefList(
      '사용자 창고 이동',
      group.userDocs.map((u) => {
        const diff = u.diffFields ?? [];

        return `<code>${esc(u.uid)}</code> · gear <code>${esc(u.gearId)}</code> · ${
          u.hasCanonical ? '생존 복사본 있음 → 배열 합집합' : '생존 복사본 없음 → 복사 이동'
        }${diff.length ? ` · <span class="warn">수동 판단: ${esc(diff.join(', '))} 상이</span>` : ''}`;
      })
    )}
    ${renderRefList(
      '가방 재작성',
      group.bagRefs.map(
        (b) =>
          `<code>${esc(b.bagId)}</code>${b.bagName ? ` (${esc(b.bagName)})` : ''} · dup ${b.dupIds.length}개${
            b.coexist ? ` · <span class="warn">공존 → weight ${b.bagWeight} − ${b.weightDelta}</span>` : ''
          }`
      )
    )}
    ${renderRefList(
      '가방 템플릿 재작성',
      group.templateRefs.map(
        (t) =>
          `<code>${esc(t.uid)}</code>/<code>${esc(t.templateId)}</code>${t.templateName ? ` (${esc(t.templateName)})` : ''} · dup ${t.dupIds.length}개${
            t.coexist ? ` · <span class="warn">공존 → weight ${t.templateWeight} − ${t.weightDelta}</span>` : ''
          }`
      )
    )}
    ${renderRefList('앱·CMS 참조 컬렉션', appRefs)}
    ${
      group.coexistBags.length || group.coexistTemplates.length
        ? `<p class="warn">⚠ weight 차감 대상 — 가방 ${group.coexistBags.length}건 / 템플릿 ${group.coexistTemplates.length}건</p>`
        : ''
    }
    ${
      group.conflictUserDocs.length
        ? `<p class="warn">⚠ 사용자 복사본 충돌 ${group.conflictUserDocs.length}건 — 기본 동작은 생존 복사본 유지 + 배열 합집합</p>`
        : ''
    }
    ${renderGroupFeedback(group, index)}
  </section>`;
};

const renderNearDuplicates = (list) => {
  if (!list.length) {
    return '<p class="empty">유사 중복 없음</p>';
  }

  return list
    .map(
      (nd) => `
  <section class="near">
    <header>
      <span class="badge b-warn">${esc(nd.type)}</span>
      <span class="reason">${esc(nd.reason)}</span>
      <code class="key">${esc(nd.key)}</code>
    </header>
    <div class="table-wrap"><table>
      <thead><tr><th>id</th><th>회사</th><th>한글명</th><th>영문명</th><th>색상</th><th>사이즈</th><th>무게</th><th>groupId</th><th>생성일</th></tr></thead>
      <tbody>${nd.docs
        .map(
          (d) =>
            `<tr><td class="mono">${esc(d.id)}</td><td>${esc(d.company)}</td><td>${esc(d.nameKorean || '-')}</td><td>${esc(d.name || '-')}</td><td>${esc(d.color || '-')}</td><td>${esc(d.size || '-')}</td><td>${d.weight || '-'}</td><td class="mono">${esc(d.groupId || '-')}</td><td>${formatDate(d.createDate)}</td></tr>`
        )
        .join('')}</tbody>
    </table></div>
    ${renderMemoOnly('near', nearDuplicateKey(nd), '메모 (선택) — 수동 병합 여부·확인 사항')}
  </section>`
    )
    .join('');
};

const renderConflicts = (plan) => {
  const rows = plan.groups.flatMap((g) =>
    g.conflictUserDocs.map((u) => ({ ...u, canonicalId: g.canonicalId, key: g.key }))
  );

  if (!rows.length) {
    return '<p class="empty">사용자 복사본 충돌 없음</p>';
  }

  return `
  <div class="table-wrap"><table>
    <thead><tr><th>uid</th><th>dup gear</th><th>비교 대상(유지될 복사본)</th><th>상이 필드</th><th>중복 키</th><th>메모</th></tr></thead>
    <tbody>${rows
      .map(
        (r) =>
          `<tr><td class="mono">${esc(r.uid)}</td><td class="mono">${esc(r.gearId)}</td><td class="mono">${esc(r.comparedWith ?? r.canonicalId)}${
            r.comparedWith && r.comparedWith !== r.canonicalId ? ' <span class="warn">(생존 복사본 없음 → 최고령 dup 베이스)</span>' : ''
          }</td><td>${esc((r.diffFields ?? []).join(', '))}</td><td class="mono">${esc(r.key)}</td><td>${renderMemoOnly(
            'conflict',
            conflictKey(r),
            '메모 (선택)'
          )}</td></tr>`
      )
      .join('')}</tbody>
  </table></div>
  <p class="empty">apply 기본 동작: 유지될 복사본의 내용을 그대로 두고 bags/useless/used 만 합집합 (다른 dup 복사본의 수정 내용은 버려짐). 필요하면 개별 수동 조정.</p>`;
};

/** 변형 충돌 컴포넌트 (병합하지 않음) */
const renderVariantConflicts = (list) => {
  if (!list.length) {
    return '<p class="empty">변형 충돌 없음</p>';
  }

  return list
    .map(
      (vc) => `
  <section class="near">
    <header>
      <span class="badge b-warn">변형 충돌</span>
      <span class="reason">${esc(vc.axes.join(', '))} 이(가) 2종 이상 — 병합하지 않음</span>
      <span class="cnt">색상 [${esc(vc.colors.join(', ') || '-')}] · 사이즈 [${esc(vc.sizes.join(', ') || '-')}]</span>
    </header>
    <div class="table-wrap"><table>
      <thead><tr><th>id</th><th>회사</th><th>이름</th><th>색상</th><th>사이즈</th><th>무게</th><th>변형 정보 부족</th></tr></thead>
      <tbody>${vc.docs
        .map(
          (d) =>
            `<tr><td class="mono">${esc(d.id)}</td><td>${esc(d.company)}</td><td>${esc(displayName(d))}</td><td>${esc(d.color || '-')}</td><td>${esc(d.size || '-')}</td><td>${d.weight || '-'}</td><td>${
              vc.variantPoorIds.includes(d.id) ? '<span class="warn">예 — 고아 삭제 후보</span>' : '아니오'
            }</td></tr>`
        )
        .join('')}</tbody>
    </table></div>
  </section>`
    )
    .join('');
};

/** 고아 삭제 예정/보류 목록 */
const renderOrphanDeletes = (list) => {
  if (!list.length) {
    return '<p class="empty">고아 삭제 대상 없음</p>';
  }

  return `
  <div class="table-wrap"><table>
    <thead><tr><th>판정</th><th>id</th><th>회사</th><th>이름</th><th>색상</th><th>사이즈</th><th>무게</th><th>참조</th></tr></thead>
    <tbody>${list
      .map((o) => {
        const refs = nonZeroRefs(o.refCounts);

        return `<tr><td>${
          o.eligible ? '<span class="warn">삭제 예정</span>' : '보류'
        }</td><td class="mono">${esc(o.id)}</td><td>${esc(o.doc.company)}</td><td>${esc(displayName(o.doc))}</td><td>${esc(o.doc.color || '-')}</td><td>${esc(o.doc.size || '-')}</td><td>${o.doc.weight || '-'}</td><td>${
          refs.length ? esc(refs.join(', ')) : '없음(0)'
        }</td></tr>`;
      })
      .join('')}</tbody>
  </table></div>
  <p class="empty">apply 는 삭제 직전에 참조 0 을 다시 확인하고, 참조가 발견되면 삭제하지 않고 보류로 기록합니다.</p>`;
};

const renderUnnamed = (list) => {
  if (!list.length) {
    return '<p class="empty">이름 없는 문서 없음</p>';
  }

  return `
  <div class="table-wrap"><table>
    <thead><tr><th>id</th><th>회사</th><th>색상</th><th>사이즈</th><th>무게</th><th>카테고리</th><th>생성일</th></tr></thead>
    <tbody>${list
      .map(
        (d) =>
          `<tr><td class="mono">${esc(d.id)}</td><td>${esc(d.company)}</td><td>${esc(d.color || '-')}</td><td>${esc(d.size || '-')}</td><td>${d.weight || '-'}</td><td>${esc(d.category || '-')}</td><td>${formatDate(d.createDate)}</td></tr>`
      )
      .join('')}</tbody>
  </table></div>`;
};

const renderReport = (rawPlan) => {
  // 구형 plan 호환 — 없는 집계는 0, 없는 참조 필드는 빈 배열로 채운다.
  const plan = {
    ...rawPlan,
    // 피드백 컨트롤의 radio name 에 쓸 전역 인덱스를 부여한다(회사별로 묶여 렌더되므로 미리 매긴다).
    groups: rawPlan.groups.map((g, i) => ({ ...normalizeGroup(g), feedbackIndex: i })),
  };
  const r = { ...plan.refCounts };
  const byCompany = new Map();

  plan.groups.forEach((g) => {
    pushTo(byCompany, g.mergedCatalog.companyKorean || g.mergedCatalog.company || '(회사 없음)', g);
  });

  const companies = [...byCompany.entries()].sort((a, b) => b[1].length - a[1].length);
  const stat = (value, label) => `<div class="stat"><b>${value ?? 0}</b><span>${esc(label)}</span></div>`;

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>gear 중복 통합 검토 리포트</title>
<style>
  :root {
    --bg: #f6f7f9; --card: #fff; --line: #e4e6eb; --fg: #1b1d21; --muted: #6b7280;
    --keep: #15803d; --keepbg: #dcfce7; --del: #b91c1c; --delbg: #fee2e2;
    --new: #1d4ed8; --newbg: #dbeafe; --warn: #b45309; --warnbg: #fef3c7;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg);
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; }
  header.top { background: var(--card); border-bottom: 1px solid var(--line); padding: 24px 28px; }
  header.top h1 { margin: 0 0 4px; font-size: 20px; }
  header.top p { margin: 0; color: var(--muted); font-size: 12px; }
  .summary { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    padding: 20px 28px; }
  .stat { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; }
  .stat b { display: block; font-size: 22px; }
  .stat span { color: var(--muted); font-size: 12px; }
  main { padding: 0 28px 60px; }
  h2 { font-size: 16px; margin: 32px 0 12px; padding-bottom: 8px; border-bottom: 2px solid var(--line); }
  details.company { background: var(--card); border: 1px solid var(--line); border-radius: 10px;
    margin-bottom: 12px; }
  details.company > summary { cursor: pointer; padding: 14px 16px; font-weight: 600; }
  details.company > summary .n { color: var(--muted); font-weight: 400; margin-left: 8px; font-size: 12px; }
  .company-body { padding: 0 16px 16px; }
  section.group { border: 1px solid var(--line); border-radius: 10px; padding: 14px; margin-top: 12px; }
  section.group > header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px; margin-bottom: 12px; }
  section.group h3 { margin: 0; font-size: 15px; }
  .cnt { color: var(--muted); font-size: 12px; }
  .key { font-size: 11px; color: var(--muted); background: var(--bg); padding: 2px 6px; border-radius: 4px;
    word-break: break-all; }
  .docs { display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
  .doc { display: flex; gap: 10px; border: 1px solid var(--line); border-radius: 8px; padding: 10px; }
  .doc.keep { border-color: var(--keep); background: #f6fdf8; }
  .doc.del { background: #fffafa; }
  .thumb { width: 84px; height: 100px; flex: 0 0 84px; background: var(--bg); border-radius: 6px;
    display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .thumb img { width: 100%; height: 100%; object-fit: contain; }
  .noimg { font-size: 10px; color: var(--muted); text-align: center; }
  .meta { min-width: 0; flex: 1; }
  .badges { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px; }
  .badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 999px; }
  .b-keep { color: var(--keep); background: var(--keepbg); }
  .b-del { color: var(--del); background: var(--delbg); }
  .b-new { color: var(--new); background: var(--newbg); }
  .b-warn { color: var(--warn); background: var(--warnbg); }
  .b-near { color: #6d28d9; background: #ede9fe; }
  .b-exact { color: var(--muted); background: var(--bg); }
  .nm { font-weight: 600; word-break: break-word; }
  .sub { color: var(--muted); font-size: 11px; word-break: break-word; margin-bottom: 6px; }
  dl { margin: 0; display: grid; gap: 1px 8px; grid-template-columns: 1fr 1fr; }
  dl > div { display: flex; gap: 6px; font-size: 11px; min-width: 0; }
  dt { color: var(--muted); flex: 0 0 auto; }
  dd { margin: 0; min-width: 0; word-break: break-word; }
  dd.url { font-size: 10px; word-break: break-all; }
  .id { margin-top: 6px; font-family: ui-monospace, monospace; font-size: 10px; color: var(--muted);
    word-break: break-all; }
  .merged { margin-top: 12px; padding: 10px; background: var(--bg); border-radius: 8px; }
  .merged h4, .refs h4 { margin: 0 0 6px; font-size: 12px; }
  .merged dl { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
  .refs { margin-top: 10px; font-size: 12px; }
  .refs ul { margin: 0; padding-left: 18px; }
  .refs code { font-family: ui-monospace, monospace; font-size: 11px; }
  .warn { color: var(--warn); font-weight: 600; }
  section.near { background: var(--card); border: 1px solid var(--line); border-radius: 10px;
    padding: 12px; margin-bottom: 10px; }
  section.near > header { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px; }
  .reason { font-size: 12px; color: var(--muted); }
  table { width: 100%; border-collapse: collapse; font-size: 12px; background: var(--card); }
  th, td { border: 1px solid var(--line); padding: 5px 7px; text-align: left; }
  th { background: var(--bg); font-size: 11px; }
  .mono { font-family: ui-monospace, monospace; font-size: 10px; }
  .table-wrap { overflow-x: auto; }
  .empty { color: var(--muted); font-size: 12px; }
  /* Phase 1.5 — 피드백 UI */
  .fbbar { position: sticky; top: 0; z-index: 10; display: flex; flex-wrap: wrap; align-items: center;
    gap: 12px; padding: 10px 28px; background: var(--card); border-bottom: 1px solid var(--line);
    box-shadow: 0 1px 3px rgb(0 0 0 / 6%); }
  .fbbar b { font-size: 13px; }
  .fbbar .grow { flex: 1; }
  .fbbar button { font: inherit; font-size: 12px; padding: 7px 14px; border-radius: 8px;
    border: 1px solid var(--line); background: var(--card); color: var(--fg); cursor: pointer; }
  .fbbar button.primary { background: var(--fg); color: var(--card); border-color: var(--fg); font-weight: 600; }
  .fbbar button:disabled { opacity: .5; cursor: default; }
  .fbbar .count { font-size: 12px; color: var(--muted); }
  .fbbar .count b { color: var(--del); }
  #fb-status { font-size: 12px; }
  #fb-status.ok { color: var(--keep); }
  #fb-status.err { color: var(--del); }
  #fb-help { display: none; padding: 10px 28px; background: var(--warnbg); color: var(--warn);
    font-size: 12px; border-bottom: 1px solid var(--line); }
  #fb-help code { font-family: ui-monospace, monospace; }
  #fb-json { display: none; width: 100%; height: 120px; margin-top: 8px; font-family: ui-monospace, monospace;
    font-size: 11px; }
  .fb { margin-top: 10px; padding: 10px; border: 1px dashed var(--line); border-radius: 8px; background: var(--bg); }
  .fb-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 6px; }
  .fb-lbl { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; }
  .fb-opt { font-size: 12px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; }
  .fb-state { font-size: 11px; font-weight: 700; }
  .fb textarea { width: 100%; box-sizing: border-box; font: inherit; font-size: 12px; padding: 6px 8px;
    border: 1px solid var(--line); border-radius: 6px; background: var(--card); color: var(--fg); resize: vertical; }
  section.group.excluded { background: #fff7f7; border-color: var(--del); }
  section.group.excluded .docs { opacity: .55; }
  td .fb { margin: 0; padding: 0; border: 0; background: none; min-width: 160px; }
</style>
</head>
<body>
<header class="top">
  <h1>gear 중복 통합 검토 리포트</h1>
  <p>생성 ${new Date(plan.generatedAt).toLocaleString('ko-KR')} · 적용 전 반드시 검토하세요 (스펙 §결정 7) · apply 는 참조를 실행 시점에 재스캔합니다</p>
</header>

<div class="fbbar">
  <b>검토 피드백</b>
  <span class="count">제외 <b id="fb-ex">0</b>건 · 메모 <span id="fb-memo">0</span>건</span>
  <span id="fb-status"></span>
  <span class="grow"></span>
  <button type="button" id="fb-reset">입력 초기화</button>
  <button type="button" class="primary" id="fb-save">피드백 저장</button>
</div>
<div id="fb-help"></div>

<div class="summary">
  ${stat(plan.totalGearDocs, '전체 gear 문서')}
  ${stat(plan.groupCount, '중복 그룹')}
  ${stat(plan.dupDocCount, '삭제될 문서')}
  ${stat(r.affectedUsers, '영향 사용자')}
  ${stat(r.userDocs, '창고 문서 이동')}
  ${stat(r.conflictUserDocs, '창고 복사본 충돌')}
  ${stat(r.bags, '영향 가방')}
  ${stat(r.coexistBags, 'weight 차감 가방')}
  ${stat(r.templates, '영향 템플릿')}
  ${stat(r.coexistTemplates, 'weight 차감 템플릿')}
  ${stat(r.rankDocs, 'gear-rank 문서')}
  ${stat(r.reviewDocs, 'gear-review 문서')}
  ${stat(r.commentTrees, '댓글 트리')}
  ${stat(r.commentDocs, '댓글·대댓글 문서')}
  ${stat(r.commentLikes, '댓글 좋아요')}
  ${stat(r.feedDocs, 'feed-content 카드')}
  ${stat(plan.nearGroupCount ?? plan.groups.filter((g) => g.origin === GroupOrigin.NearDuplicate).length, '유사중복 승인 그룹')}
  ${stat((plan.variantConflicts ?? []).length, '변형 충돌')}
  ${stat((plan.orphanDeletes ?? []).filter((o) => o.eligible).length, '고아 삭제 예정')}
</div>

<main>
  <h2>자동 병합 대상 (회사별 ${companies.length}개 · 그룹 ${plan.groupCount}개)</h2>
  ${
    companies.length
      ? companies
          .map(
            ([company, groups]) => `
  <details class="company">
    <summary>${esc(company)}<span class="n">그룹 ${groups.length}개 · 삭제 ${sumBy(groups, (g) => g.dupIds.length)}개</span></summary>
    <div class="company-body">${groups.map((g) => renderGroupCard(g, g.feedbackIndex)).join('')}</div>
  </details>`
          )
          .join('')
      : '<p class="empty">자동 병합 대상 그룹 없음</p>'
  }

  <h2>사용자 복사본 충돌 — 수동 판단 (${r.conflictUserDocs ?? 0}건)</h2>
  ${renderConflicts(plan)}

  <h2>변형 충돌 — 병합하지 않음 (${(plan.variantConflicts ?? []).length}건)</h2>
  ${renderVariantConflicts(plan.variantConflicts ?? [])}

  <h2>고아 삭제 — 참조 0 인 변형 정보 부족 문서 (${(plan.orphanDeletes ?? []).filter((o) => o.eligible).length}건 예정 / ${(plan.orphanDeletes ?? []).filter((o) => !o.eligible).length}건 보류)</h2>
  ${renderOrphanDeletes(plan.orphanDeletes ?? [])}

  <h2>유사 중복 — 수동 검토 (${plan.nearDuplicates.length}건, 자동 병합하지 않음)</h2>
  ${renderNearDuplicates(plan.nearDuplicates)}

  <h2>이름 없음 — 그룹핑 제외 (${plan.unnamed.length}건)</h2>
  ${renderUnnamed(plan.unnamed)}
</main>

<script>
/* Phase 1.5 — 리포트 피드백. 외부 리소스 없음, 입력은 localStorage 에 실시간 보존. */
(function () {
  var PLAN_AT = ${JSON.stringify(plan.generatedAt ?? 0)};
  var ENDPOINT = ${JSON.stringify(`http://localhost:${FEEDBACK_PORT}${FEEDBACK_ROUTE}`)};
  var APPROVE = ${JSON.stringify(FeedbackDecision.Approve)};
  var EXCLUDE = ${JSON.stringify(FeedbackDecision.Exclude)};
  var STORAGE_KEY = 'dedupe-feedback:' + PLAN_AT;
  var SECTION = { group: 'groups', near: 'nearDuplicates', conflict: 'conflicts' };

  var blocks = [].slice.call(document.querySelectorAll('.fb[data-fb-key]'));
  var statusEl = document.getElementById('fb-status');
  var helpEl = document.getElementById('fb-help');
  var exEl = document.getElementById('fb-ex');
  var memoEl = document.getElementById('fb-memo');
  var saveBtn = document.getElementById('fb-save');
  var resetBtn = document.getElementById('fb-reset');

  var readLocal = function () {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
    } catch (e) {
      return null;
    }
  };

  var writeLocal = function (data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      /* 프라이빗 모드 등에서 실패해도 페이지는 동작해야 한다 */
    }
  };

  var setStatus = function (msg, kind) {
    statusEl.textContent = msg || '';
    statusEl.className = kind || '';
  };

  var blockMemo = function (block) {
    return block.querySelector('textarea[data-fb-memo]');
  };

  var blockDecision = function (block) {
    var checked = block.querySelector('input[type=radio]:checked');

    return checked ? checked.value : null;
  };

  /* DOM → 피드백 객체 */
  var collect = function () {
    var out = { planGeneratedAt: PLAN_AT, groups: {}, nearDuplicates: {}, conflicts: {} };

    blocks.forEach(function (block) {
      var kind = block.getAttribute('data-fb-kind');
      var key = block.getAttribute('data-fb-key');
      var memo = (blockMemo(block).value || '').trim();

      if (kind === 'group') {
        var decision = blockDecision(block) || APPROVE;

        if (decision === EXCLUDE || memo) {
          out.groups[key] = { decision: decision, memo: memo };
        }

        return;
      }

      if (memo) {
        out[SECTION[kind]][key] = memo;
      }
    });

    return out;
  };

  /* 피드백 객체 → DOM */
  var applyState = function (data) {
    if (!data) {
      return;
    }

    blocks.forEach(function (block) {
      var kind = block.getAttribute('data-fb-kind');
      var key = block.getAttribute('data-fb-key');

      if (kind === 'group') {
        var entry = (data.groups || {})[key];

        if (!entry) {
          return;
        }

        var target = block.querySelector('input[type=radio][value="' + (entry.decision === EXCLUDE ? EXCLUDE : APPROVE) + '"]');

        if (target) {
          target.checked = true;
        }
        blockMemo(block).value = entry.memo || '';

        return;
      }

      var memo = (data[SECTION[kind]] || {})[key];

      if (typeof memo === 'string') {
        blockMemo(block).value = memo;
      }
    });
  };

  var paint = function () {
    var excluded = 0;
    var memos = 0;

    blocks.forEach(function (block) {
      var kind = block.getAttribute('data-fb-kind');
      var memo = (blockMemo(block).value || '').trim();

      if (memo) {
        memos += 1;
      }

      if (kind !== 'group') {
        return;
      }

      var isExcluded = blockDecision(block) === EXCLUDE;
      var card = block.closest('section.group');
      var badge = block.querySelector('[data-fb-badge]');

      if (card) {
        card.className = isExcluded ? 'group excluded' : 'group';
      }

      if (badge) {
        badge.textContent = isExcluded ? '제외됨 — apply 에서 건너뜀' : '';
        badge.style.color = isExcluded ? '#b91c1c' : '';
      }

      if (isExcluded) {
        excluded += 1;
      }
    });

    exEl.textContent = String(excluded);
    memoEl.textContent = String(memos);
  };

  var onChange = function () {
    paint();
    writeLocal(collect());
    setStatus('저장 안 됨 (브라우저에만 보관)', 'err');
  };

  blocks.forEach(function (block) {
    blockMemo(block).addEventListener('input', onChange);
    [].slice.call(block.querySelectorAll('input[type=radio]')).forEach(function (radio) {
      radio.addEventListener('change', onChange);
    });
  });

  saveBtn.addEventListener('click', function () {
    var payload = collect();

    writeLocal(payload);
    saveBtn.disabled = true;
    setStatus('저장 중...', '');

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().then(function (body) {
          if (!res.ok) {
            throw new Error(body.error || ('HTTP ' + res.status));
          }

          return body;
        });
      })
      .then(function (body) {
        helpEl.style.display = 'none';
        setStatus('저장 완료 — 제외 ' + body.excluded + '건 / 메모 ' + body.memos + '건', 'ok');
      })
      .catch(function (e) {
        setStatus('저장 실패: ' + e.message, 'err');
        showFallback(payload, e.message);
      })
      .then(function () {
        saveBtn.disabled = false;
      });
  });

  var showFallback = function (payload, reason) {
    var text = JSON.stringify(payload, null, 2);

    helpEl.style.display = 'block';
    helpEl.innerHTML =
      '피드백 서버에 저장하지 못했습니다 (' + reason + ').<br>' +
      '터미널에서 <code>node .claude/skills/crawl-gear/migrate-dedupe.js --feedback-server</code> 를 실행한 뒤 다시 저장하세요.<br>' +
      '또는 아래 JSON 을 <code>out/dedupe-feedback.json</code> 으로 직접 저장하세요. ' +
      '<button type="button" id="fb-copy">JSON 복사</button> ' +
      '<button type="button" id="fb-download">파일로 저장</button>' +
      '<textarea id="fb-json" readonly></textarea>';

    var area = document.getElementById('fb-json');

    area.value = text;
    area.style.display = 'block';

    document.getElementById('fb-copy').addEventListener('click', function () {
      var done = function () { setStatus('JSON 을 클립보드에 복사했습니다', 'ok'); };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { area.select(); });

        return;
      }
      area.select();

      try {
        document.execCommand('copy');
        done();
      } catch (e) {
        setStatus('복사 실패 — 아래 텍스트를 직접 복사하세요', 'err');
      }
    });

    document.getElementById('fb-download').addEventListener('click', function () {
      try {
        var url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        var a = document.createElement('a');

        a.href = url;
        a.download = 'dedupe-feedback.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      } catch (e) {
        setStatus('다운로드 실패 — JSON 복사를 사용하세요', 'err');
      }
    });
  };

  resetBtn.addEventListener('click', function () {
    if (!window.confirm('이 페이지의 검토 입력을 모두 초기화할까요? (저장된 파일은 그대로입니다)')) {
      return;
    }

    blocks.forEach(function (block) {
      blockMemo(block).value = '';

      var approve = block.querySelector('input[type=radio][value="' + APPROVE + '"]');

      if (approve) {
        approve.checked = true;
      }
    });
    writeLocal(collect());
    paint();
    setStatus('초기화했습니다', '');
  });

  /* 초기 로드: 서버 저장본을 불러온 뒤 브라우저 입력(더 최근)을 덮어씌운다 */
  var local = readLocal();

  applyState(local);
  paint();

  fetch(ENDPOINT, { method: 'GET' })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (server) {
      if (!server) {
        return;
      }

      if (server.planGeneratedAt !== PLAN_AT) {
        setStatus('저장된 피드백은 다른 plan 것입니다 (무시)', 'err');

        return;
      }

      var merged = {
        planGeneratedAt: PLAN_AT,
        groups: Object.assign({}, server.groups || {}, (local && local.groups) || {}),
        nearDuplicates: Object.assign({}, server.nearDuplicates || {}, (local && local.nearDuplicates) || {}),
        conflicts: Object.assign({}, server.conflicts || {}, (local && local.conflicts) || {}),
      };

      applyState(merged);
      paint();
      writeLocal(merged);
      setStatus('저장된 피드백을 불러왔습니다', 'ok');
    })
    .catch(function () {
      /* 서버 미기동은 정상 상황 — 저장 시 안내한다 */
    });
})();
</script>
</body>
</html>`;
};

// ── PHASE 2: APPLY ────────────────────────────────────────────────
/**
 * batch 쓰기 래퍼.
 * - dryRun 이면 op payload 만 수집하고 커밋하지 않는다.
 * - 실제 실행에서는 payload 를 누적하지 않고 개수만 센다(메모리 보호).
 * - commit 실패는 상위로 전파해 전체 중단시키되, batch 는 항상 재생성한다.
 */
const createWriter = (store, dryRun, materialize = materializeFieldValues, batchLimit = BATCH_LIMIT) => {
  // 원자 단위(증분 1 + 삭제 1 = 최소 2 op)가 항상 한 커밋에 들어가도록 하한 2 를 강제한다
  batchLimit = Math.max(2, batchLimit);

  const ops = [];
  let batch = dryRun ? null : store.batch();
  let pending = 0;
  let queued = 0;
  let committed = 0;

  const flush = async () => {
    if (dryRun || pending === 0) {
      pending = 0;

      return;
    }

    const current = batch;
    const size = pending;

    try {
      await current.commit();
      committed += size;
    } catch (e) {
      e.isCommitFailure = true;
      throw e;
    } finally {
      // 커밋 성공/실패와 무관하게 새 batch 로 교체 — 오염된 batch 재사용을 막는다.
      batch = store.batch();
      pending = 0;
    }
  };

  const enqueue = async (kind, ref, data) => {
    queued += 1;

    if (dryRun) {
      ops.push({ kind, path: ref.path, data: data ?? null });

      return;
    }

    const payload = kind === 'delete' ? null : materialize(data);

    if (kind === 'set') {
      batch.set(ref, payload);
    } else if (kind === 'update') {
      batch.update(ref, payload);
    } else {
      batch.delete(ref);
    }
    pending += 1;

    if (pending >= batchLimit) {
      await flush();
    }
  };

  /**
   * 다음 n 개 op 가 같은 batch(=같은 커밋)에 들어가도록 미리 경계를 정리한다.
   * increment 같은 비멱등 쓰기와 그에 딸린 dup 삭제가 서로 다른 커밋으로 쪼개지면
   * 중간 크래시 후 재실행 때 이중 합산이 생기므로 반드시 함께 커밋되어야 한다.
   */
  const reserve = async (n) => {
    if (dryRun || pending === 0 || pending + n <= batchLimit) {
      return;
    }

    await flush();
  };

  return {
    enqueue,
    flush,
    reserve,
    ops,
    getBatchLimit: () => batchLimit,
    getStats: () => ({ queued, committed, pending }),
  };
};

/**
 * 비멱등 쓰기(increment)와 그에 딸린 dup 삭제를 한 커밋에 담을 수 있는 크기로 자른다.
 * 한 커밋에 안 들어가면 원자성이 깨져 재실행 시 이중 합산이 생기므로,
 * "increment 1 + 삭제 n" 이 batchLimit 안에 들어가는 단위로 나눠 처리한다.
 */
const atomicChunks = (items, writer) => {
  const size = Math.max(1, writer.getBatchLimit() - 1);
  const out = [];

  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }

  return out;
};

/**
 * bag / bagTemplates 의 gears 재작성.
 * 배열은 한 번의 update 로 전량 재작성한다 — 항목 순서를 보존해야 하고(치환 위치 유지),
 * arrayRemove/arrayUnion 2회 쓰기는 중간 크래시 시 항목 유실 또는 weight 이중 차감 위험이 있다.
 * weight 는 원자 increment(-delta) 를 쓰되, 하한 0 을 넘길 때만 절대값으로 쓴다.
 */
const applyGearArrayDoc = async (store, docRef, uid, dupSet, canonicalId, writer, log, label) => {
  const snap = await docRef.get();

  if (!snap.exists) {
    log.skipped.push(`${label} 없음: ${docRef.path}`);

    return;
  }

  const data = snap.data();
  const gears = Array.isArray(data.gears) ? data.gears : [];
  const { next, removed } = rewriteBagGears(gears, dupSet, canonicalId);

  if (sameArray(gears, next)) {
    return;
  }

  const payload = { gears: next };

  if (removed.length) {
    const delta = await removedWeight(store, uid || data.userId || '', removed);
    const before = toNum(data.weight);

    payload.weight = before - delta < 0 ? 0 : AtomicOp.increment(-delta);
    log.weightAdjusted.push({ path: docRef.path, delta, before, after: Math.max(0, before - delta) });
  }

  await writer.enqueue('update', docRef, payload);

  if (label === BAG) {
    log.bagUpdated.push(docRef.id);
  } else {
    log.templateUpdated.push(docRef.path);
  }
};

/** 사라지는 항목들의 무게 합 — 사용자 복사본이 있으면 그 값(0 이어도), 없으면 전역 폴백 */
const removedWeight = async (store, uid, removedIds) => {
  let sum = 0;

  for (const gid of removedIds) {
    let resolved = null;

    if (uid) {
      const snap = await store.collection(USERS).doc(uid).collection(USER_GEARS).doc(gid).get();

      if (snap.exists) {
        resolved = toNum(snap.data().weight);
      }
    }

    if (resolved === null) {
      const gsnap = await store.collection(GEAR).doc(gid).get();

      resolved = gsnap.exists ? toNum(gsnap.data().weight) : 0;
    }
    sum += resolved;
  }

  return sum;
};

/**
 * 3단계 — users/{uid}/gears 이동.
 * uid 단위로 canonical + 모든 dup 문서를 한 번에 읽고 단일 병합 payload 를 계산해 1회만 쓴다
 * (반복 read-modify-write 로 앞선 쓰기가 유실되는 문제 방지 — 스펙 Phase 2 안전장치).
 */
const applyUserGearMove = async (store, group, refs, writer, log) => {
  const byUid = new Map();

  refs.userDocs.forEach((u) => {
    if (!byUid.has(u.uid)) {
      byUid.set(u.uid, new Set());
    }
    byUid.get(u.uid).add(u.gearId);
  });

  for (const [uid, gearIdSet] of byUid) {
    const gearsCol = store.collection(USERS).doc(uid).collection(USER_GEARS);
    const dupSnaps = [];

    for (const gearId of gearIdSet) {
      if (gearId === group.canonicalId) {
        continue;
      }

      const snap = await gearsCol.doc(gearId).get();

      if (snap.exists) {
        dupSnaps.push(snap);
      }
    }

    if (dupSnaps.length === 0) {
      continue;
    }

    const canonicalRef = gearsCol.doc(group.canonicalId);
    const canonicalSnap = await canonicalRef.get();
    const dupData = dupSnaps.map((s) => s.data());
    const createDates = [
      ...(canonicalSnap.exists ? [toNum(canonicalSnap.data().createDate)] : []),
      ...dupData.map((d) => toNum(d.createDate)),
    ].filter((n) => n > 0);

    // 병합 쓰기와 dup 삭제를 같은 커밋으로 묶는다(부분 적용 방지).
    await writer.reserve(1 + dupSnaps.length);

    if (canonicalSnap.exists) {
      // 생존 복사본 유지 + 배열 합집합(원자) + createDate 최소
      const patch = { id: group.canonicalId };

      ARRAY_FIELDS.forEach((f) => {
        const values = uniq(dupData.flatMap((d) => (Array.isArray(d[f]) ? d[f] : [])));

        if (values.length) {
          patch[f] = AtomicOp.arrayUnion(...values);
        }
      });

      if (createDates.length) {
        patch.createDate = Math.min(...createDates);
      }

      await writer.enqueue('update', canonicalRef, patch);
      log.userDocsMerged.push({ uid, from: dupSnaps.map((s) => s.id) });
    } else {
      // 생존 복사본이 없으면 가장 오래된 dup 복사본을 베이스로, 나머지 배열을 합집합
      const ordered = [...dupSnaps].sort(
        (a, b) =>
          toNum(a.data().createDate) - toNum(b.data().createDate) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
      );
      const base = { ...ordered[0].data(), id: group.canonicalId };

      ARRAY_FIELDS.forEach((f) => {
        base[f] = uniq(dupData.flatMap((d) => (Array.isArray(d[f]) ? d[f] : [])));
      });

      if (createDates.length) {
        base.createDate = Math.min(...createDates);
      }

      await writer.enqueue('set', canonicalRef, base);
      log.userDocsMoved.push({ uid, from: ordered.map((s) => s.id) });
    }

    for (const snap of dupSnaps) {
      await writer.enqueue('delete', snap.ref, null);
    }
  }
};

/** gear-rank / gear-review 복사 시 gear id 계열 필드를 canonicalId 로 강제 교체 */
const withCanonicalIdFields = (data, canonicalId) => {
  const out = { ...data };

  GEAR_ID_FIELDS.forEach((f) => {
    if (out[f] !== undefined) {
      out[f] = canonicalId;
    }
  });

  return out;
};

/**
 * 4단계 — gear-rank: dup count 를 canonical 에 increment 합산 후 dup 삭제.
 * 재스캔 결과가 아니라 dupIds 를 직접 순회한다 — 스캔~쓰기 사이에 새로 생긴 랭크 문서까지 닫는다.
 */
const applyGearRank = async (store, group, writer, log) => {
  const col = store.collection(GEAR_RANK);
  const dupSnaps = [];

  for (const dupId of group.dupIds) {
    const snap = await col.doc(dupId).get();

    if (snap.exists) {
      dupSnaps.push(snap);
    }
  }

  if (dupSnaps.length === 0) {
    return;
  }

  const canonicalRef = col.doc(group.canonicalId);
  const canonicalSnap = await canonicalRef.get();
  const allDupData = dupSnaps.map((s) => s.data());
  const overallUpdatedAt = latestValue([
    canonicalSnap.exists ? canonicalSnap.data().updatedAt : null,
    ...allDupData.map((d) => d.updatedAt),
  ]);
  const overallCategory = allDupData.find((d) => d.category)?.category;
  const newestDup = allDupData.reduce((best, d) =>
    best == null || toMillisLike(d.updatedAt) > toMillisLike(best.updatedAt) ? d : best
  );
  let exists = canonicalSnap.exists;
  let firstChunk = true;

  // count increment 와 dup 삭제는 반드시 같은 커밋에 — 쪼개지면 재실행 시 이중 합산된다.
  // 한 커밋에 다 못 담을 만큼 dup 이 많으면 "increment + 삭제" 단위로 나눠 각 단위를 원자화한다.
  for (const chunk of atomicChunks(dupSnaps, writer)) {
    const chunkData = chunk.map((s) => s.data());
    const addCount = sumBy(chunkData, (d) => toNum(d.count));

    await writer.reserve(1 + chunk.length);

    if (exists) {
      const cur = canonicalSnap.exists ? canonicalSnap.data() : {};
      const patch = { count: AtomicOp.increment(addCount) };

      if (firstChunk) {
        if (overallUpdatedAt != null) {
          patch.updatedAt = overallUpdatedAt;
        }

        if (!cur.category && overallCategory) {
          patch.category = overallCategory;
        }

        // 앱이 문서 ID 가 아닌 id 필드로 gear 를 조회하므로 항상 canonicalId 로 맞춘다.
        GEAR_ID_FIELDS.forEach((f) => {
          if (cur[f] !== undefined && cur[f] !== group.canonicalId) {
            patch[f] = group.canonicalId;
          }
        });
      }

      await writer.enqueue('update', canonicalRef, patch);
    } else {
      const created = withCanonicalIdFields(newestDup, group.canonicalId);

      // dup 문서에 id 필드가 없었더라도 앱 조회를 위해 반드시 채운다.
      created.id = group.canonicalId;
      created.count = addCount;

      if (overallUpdatedAt != null) {
        created.updatedAt = overallUpdatedAt;
      }

      await writer.enqueue('set', canonicalRef, created);
      exists = true;
    }

    for (const snap of chunk) {
      await writer.enqueue('delete', snap.ref, null);
      log.rankMerged.push(snap.id);
    }
    firstChunk = false;
  }
};

/**
 * 5단계 — gear-review: canonical 없으면 dup 복사(gear id 필드 교체), 있으면 유지. dup 삭제.
 * dupIds 를 직접 순회한다(재스캔 이후 생긴 문서까지 포함).
 */
const applyGearReview = async (store, group, writer, log) => {
  const col = store.collection(GEAR_REVIEW);
  const dupSnaps = [];

  for (const dupId of group.dupIds) {
    const snap = await col.doc(dupId).get();

    if (snap.exists) {
      dupSnaps.push(snap);
    }
  }

  if (dupSnaps.length === 0) {
    return;
  }

  const canonicalRef = col.doc(group.canonicalId);
  const canonicalSnap = await canonicalRef.get();

  await writer.reserve(1 + dupSnaps.length);

  if (!canonicalSnap.exists) {
    const newest = dupSnaps.reduce((best, s) =>
      best == null || toMillisLike(s.data().updatedAt) > toMillisLike(best.data().updatedAt) ? s : best
    );

    await writer.enqueue('set', canonicalRef, withCanonicalIdFields(newest.data(), group.canonicalId));
    log.reviewMoved.push(newest.id);
  }

  for (const snap of dupSnaps) {
    await writer.enqueue('delete', snap.ref, null);
    log.reviewDeleted.push(snap.id);
  }
};

/**
 * gear-comments 요약 문서 병합 payload — 카운터 합산 + ratingAvg 재계산 + lastCommentAt 최신.
 * `running` 이 주어지면(청크 처리) ratingAvg 는 누적 합계 기준으로 계산한다.
 */
const buildSummaryPatch = (canonicalData, dupDataList, canonicalId, running) => {
  const present = (f) =>
    (canonicalData && canonicalData[f] !== undefined) || dupDataList.some((d) => d[f] !== undefined);
  const totalOf = (f) => toNum(canonicalData?.[f]) + sumBy(dupDataList, (d) => toNum(d[f]));
  const patch = { gearId: canonicalId };

  SUMMARY_COUNTERS.forEach((f) => {
    if (!present(f)) {
      return;
    }

    const add = sumBy(dupDataList, (d) => toNum(d[f]));

    patch[f] = canonicalData ? AtomicOp.increment(add) : totalOf(f);
  });

  if (present('ratingCount') || present('ratingSum')) {
    const sum = running ? running.ratingSum : totalOf('ratingSum');
    const count = running ? running.ratingCount : totalOf('ratingCount');

    // ratingAvg 는 원자 연산으로 표현할 수 없어 읽은 값 기준으로 재계산한다(best-effort).
    patch.ratingAvg = count > 0 ? sum / count : 0;
  }

  const lastCommentAt = latestValue([
    canonicalData?.lastCommentAt,
    ...dupDataList.map((d) => d.lastCommentAt),
  ]);

  if (lastCommentAt != null) {
    patch.lastCommentAt = lastCommentAt;
  }

  return patch;
};

/**
 * 6단계 — gear-comments: 댓글 트리(2단) 복사 후 원본 삭제 + 요약 문서 카운터 병합.
 * 필드 없는 팬텀 문서를 놓치지 않도록 열거는 listDocuments 를 사용한다.
 */
const applyGearComments = async (store, group, writer, log) => {
  const col = store.collection(GEAR_COMMENTS);
  const canonicalParent = col.doc(group.canonicalId);
  const dupSummaries = [];

  for (const dupId of group.dupIds) {
    const dupParent = col.doc(dupId);
    const commentRefs = await dupParent.collection(COMMENTS).listDocuments();

    for (const commentRef of commentRefs) {
      const commentSnap = await commentRef.get();
      const targetComment = canonicalParent.collection(COMMENTS).doc(commentRef.id);
      const replyRefs = await commentRef.collection(COMMENTS).listDocuments();

      if (commentSnap.exists) {
        await writer.enqueue('set', targetComment, commentSnap.data());
      }

      for (const replyRef of replyRefs) {
        const replySnap = await replyRef.get();

        if (replySnap.exists) {
          await writer.enqueue('set', targetComment.collection(COMMENTS).doc(replyRef.id), replySnap.data());
          await writer.enqueue('delete', replyRef, null);
        }
      }

      if (commentSnap.exists) {
        await writer.enqueue('delete', commentRef, null);
      }
      log.commentsMoved.push(`${dupId}/${commentRef.id}`);
    }

    const dupSummarySnap = await dupParent.get();

    if (dupSummarySnap.exists) {
      dupSummaries.push({ ref: dupParent, data: dupSummarySnap.data() });
    }
  }

  if (dupSummaries.length === 0) {
    return;
  }

  const canonicalSummarySnap = await canonicalParent.get();
  const canonicalData = canonicalSummarySnap.exists ? canonicalSummarySnap.data() : null;
  const running = {
    ratingSum: toNum(canonicalData?.ratingSum),
    ratingCount: toNum(canonicalData?.ratingCount),
  };
  // base 가 있으면 increment 모드, 없으면(문서 부재) 절대값으로 생성한다.
  // 청크 1 이 생성한 뒤에는 그 결과를 base 로 삼아 이후 청크가 반드시 increment 하도록 한다.
  let base = canonicalData;

  // 요약 카운터 increment 와 dup 요약 삭제는 반드시 같은 커밋에 —
  // 경계가 갈린 상태로 크래시하면 재실행 때 카운터가 이중 합산된다.
  // dup 이 많으면 "increment + 삭제" 단위로 나눠 각 단위를 원자화한다.
  for (const chunk of atomicChunks(dupSummaries, writer)) {
    const chunkData = chunk.map((s) => s.data);

    running.ratingSum += sumBy(chunkData, (d) => toNum(d.ratingSum));
    running.ratingCount += sumBy(chunkData, (d) => toNum(d.ratingCount));

    const patch = buildSummaryPatch(base, chunkData, group.canonicalId, running);

    await writer.reserve(1 + chunk.length);

    if (base) {
      await writer.enqueue('update', canonicalParent, patch);
    } else {
      const created = { ...chunkData[0], ...patch };

      await writer.enqueue('set', canonicalParent, created);
      base = created;
    }

    for (const summary of chunk) {
      await writer.enqueue('delete', summary.ref, null);
      log.summaryMerged.push(summary.ref.id);
    }
  }
};

/**
 * 7단계 — comment-likes: gearId 필드만 canonical 로 (문서 ID 는 불변).
 * 재스캔 목록이 아니라 dupIds 전체로 쿼리한다 — 스캔 이후 생긴 좋아요까지 닫는다.
 */
const applyCommentLikes = async (store, group, writer, log) => {
  for (const dupId of group.dupIds) {
    const snaps = await store.collection(COMMENT_LIKES).where('gearId', '==', dupId).get();

    for (const snap of snaps.docs) {
      await writer.enqueue('update', snap.ref, { gearId: group.canonicalId });
      log.commentLikesUpdated.push(snap.id);
    }
  }
};

/**
 * 8단계 — feed-content: relatedGearId 필드만 canonical 로.
 * dupIds 전체로 쿼리한다(CMS 에서 방금 만든 카드까지 포함).
 */
const applyFeedContent = async (store, group, writer, log) => {
  for (const dupId of group.dupIds) {
    const snaps = await store.collection(FEED_CONTENT).where('relatedGearId', '==', dupId).get();

    for (const snap of snaps.docs) {
      await writer.enqueue('update', snap.ref, { relatedGearId: group.canonicalId });
      log.feedUpdated.push(snap.id);
    }
  }
};

/** 9단계 — 전역 gear: 변경 필드만 update + 배열 arrayUnion, 그 후 dup 삭제 */
const applyGlobalGear = async (store, group, canonicalSnap, writer, log) => {
  const col = store.collection(GEAR);
  const canonicalData = canonicalSnap.data();
  const dupSnaps = [];

  for (const dupId of group.dupIds) {
    const snap = await col.doc(dupId).get();

    if (snap.exists) {
      dupSnaps.push(snap);
    }
  }

  const { specs: mergedSpecs, ...catalog } = group.mergedCatalog;
  const patch = {};

  // 문서 ID = id 필드 규약 유지 (다른 값이면 교정)
  if (canonicalData.id !== group.canonicalId) {
    patch.id = group.canonicalId;
  }

  // 값이 실제로 달라지는 필드만 담는다(불필요한 쓰기·Algolia 재색인 방지).
  Object.entries(catalog).forEach(([f, v]) => {
    if (isBlank(v) && isBlank(canonicalData[f])) {
      return;
    }

    if (f === 'weight' ? toNum(canonicalData[f]) !== toNum(v) : String(canonicalData[f] ?? '') !== String(v)) {
      patch[f] = v;
    }
  });

  const specsPatch = { ...(canonicalData.specs ?? {}), ...(mergedSpecs ?? {}) };

  if (JSON.stringify(specsPatch) !== JSON.stringify(canonicalData.specs ?? {})) {
    patch.specs = specsPatch;
  }

  ARRAY_FIELDS.forEach((f) => {
    const base = Array.isArray(canonicalData[f]) ? canonicalData[f] : [];
    const extra = uniq(
      dupSnaps.flatMap((s) => {
        const v = s.data()[f];

        return Array.isArray(v) ? v : [];
      })
    ).filter((v) => !base.includes(v));

    if (extra.length) {
      patch[f] = AtomicOp.arrayUnion(...extra);
    }
  });

  if (Object.keys(patch).length) {
    await writer.enqueue('update', col.doc(group.canonicalId), patch);
  }

  for (const snap of dupSnaps) {
    await writer.enqueue('delete', snap.ref, null);
    log.gearDeleted.push(snap.id);
  }
};

const createGroupLog = (group) => ({
  key: group.key,
  canonicalId: group.canonicalId,
  dupIds: group.dupIds,
  bagUpdated: [],
  templateUpdated: [],
  userDocsMoved: [],
  userDocsMerged: [],
  rankMerged: [],
  reviewMoved: [],
  reviewDeleted: [],
  commentsMoved: [],
  summaryMerged: [],
  commentLikesUpdated: [],
  feedUpdated: [],
  gearDeleted: [],
  weightAdjusted: [],
  conflictUserDocs: [],
  skipped: [],
});

/** 그룹 하나 적용. refs 는 apply 시점에 재스캔한 참조 목록. */
const applyGroup = async (store, group, refs, writer, log) => {
  log.conflictUserDocs = refs.conflictUserDocs ?? [];

  const canonicalRef = store.collection(GEAR).doc(group.canonicalId);
  const canonicalSnap = await canonicalRef.get();

  if (!canonicalSnap.exists) {
    // 이 그룹은 전혀 적용되지 않았다 — verify 대상에서 제외되도록 표시한다.
    log.notApplied = 'canonical 문서 없음 — 이미 처리되었거나 plan 이 오래됨';
    log.skipped.push(log.notApplied);
    console.log(`  [skip] canonical 없음: ${group.canonicalId} (${group.key})`);

    return log;
  }

  const dupSet = new Set(group.dupIds);

  // 1) bag 재작성
  for (const ref of refs.bagRefs) {
    await applyGearArrayDoc(store, store.collection(BAG).doc(ref.bagId), ref.uid, dupSet, group.canonicalId, writer, log, BAG);
  }
  await writer.flush();

  // 2) users/*/bagTemplates 재작성
  for (const ref of refs.templateRefs) {
    const tplRef = store.collection(USERS).doc(ref.uid).collection(BAG_TEMPLATES).doc(ref.templateId);

    await applyGearArrayDoc(store, tplRef, ref.uid, dupSet, group.canonicalId, writer, log, BAG_TEMPLATES);
  }
  await writer.flush();

  // 3) users/*/gears 이동
  await applyUserGearMove(store, group, refs, writer, log);
  await writer.flush();

  // 4~8) 문서 ID·필드 쿼리로 접근하는 참조는 dupIds 를 직접 순회한다(재스캔 이후 생긴 것까지 포함)
  // 4) gear-rank 병합
  await applyGearRank(store, group, writer, log);
  await writer.flush();

  // 5) gear-review 이동
  await applyGearReview(store, group, writer, log);
  await writer.flush();

  // 6) gear-comments 트리·요약 이동
  await applyGearComments(store, group, writer, log);
  await writer.flush();

  // 7) comment-likes 갱신
  await applyCommentLikes(store, group, writer, log);
  await writer.flush();

  // 8) feed-content 갱신
  await applyFeedContent(store, group, writer, log);
  await writer.flush();

  // 9) 전역 gear 병합 + dup 삭제
  await applyGlobalGear(store, group, canonicalSnap, writer, log);
  await writer.flush();

  return log;
};

/**
 * 고아 삭제 — 변형 충돌 컴포넌트의 변형 정보 부족 문서를 참조 0 일 때만 삭제한다.
 * 삭제 직전에 참조를 다시 확인한다: 재스캔 집계(창고·가방·템플릿) + 문서 존재(rank/review/comments)
 * + 쿼리(comment-likes/feed-content). 하나라도 발견되면 삭제하지 않고 보류로 기록한다.
 */
const liveOrphanRefs = async (store, id, scan) => {
  const counts = { ...emptyRefCount(), ...(scan.refCountById.get(id) ?? {}) };

  // 문서 ID 로 직접 접근하는 참조 — 스캔 이후 생겼을 수 있으니 지금 다시 본다.
  counts.rank = (await store.collection(GEAR_RANK).doc(id).get()).exists ? 1 : 0;
  counts.review = (await store.collection(GEAR_REVIEW).doc(id).get()).exists ? 1 : 0;

  const commentParent = store.collection(GEAR_COMMENTS).doc(id);
  const summarySnap = await commentParent.get();
  const commentRefs = await commentParent.collection(COMMENTS).listDocuments();

  counts.comments = (summarySnap.exists ? 1 : 0) + commentRefs.length;

  const likeSnaps = await store.collection(COMMENT_LIKES).where('gearId', '==', id).get();

  counts.likes = likeSnaps.size;

  const feedSnaps = await store.collection(FEED_CONTENT).where('relatedGearId', '==', id).get();

  counts.feed = feedSnaps.size;

  return counts;
};

const applyOrphanDeletes = async (store, orphanDeletes, scan, writer) => {
  const results = [];

  for (const orphan of orphanDeletes) {
    const gearRef = store.collection(GEAR).doc(orphan.id);
    const snap = await gearRef.get();

    if (!snap.exists) {
      results.push({ id: orphan.id, deleted: false, held: '이미 없음(멱등)' });
      continue;
    }

    const counts = await liveOrphanRefs(store, orphan.id, scan);
    const found = nonZeroRefs(counts);

    if (found.length) {
      results.push({ id: orphan.id, deleted: false, held: `참조 발견: ${found.join(', ')}`, refCounts: counts });
      console.log(`  [고아 보류] ${orphan.id} — 참조 ${found.join(', ')}`);
      continue;
    }

    // 참조 0 확인 — 전역 gear 문서만 삭제하면 된다(옮길 참조가 없다).
    await writer.enqueue('delete', gearRef, null);
    results.push({ id: orphan.id, deleted: true, held: null, refCounts: counts });
  }
  await writer.flush();

  return results;
};

/** 구형 plan 호환 — 새 참조 필드가 없으면 빈 배열로 채운다. */
const normalizeGroup = (group) => ({
  ...group,
  userDocs: group.userDocs ?? [],
  conflictUserDocs: group.conflictUserDocs ?? [],
  bagRefs: group.bagRefs ?? [],
  coexistBags: group.coexistBags ?? [],
  templateRefs: group.templateRefs ?? [],
  coexistTemplates: group.coexistTemplates ?? [],
  rankRefs: group.rankRefs ?? [],
  reviewRefs: group.reviewRefs ?? [],
  commentRefs: group.commentRefs ?? [],
  commentLikeRefs: group.commentLikeRefs ?? [],
  feedRefs: group.feedRefs ?? [],
});

const sameFieldValue = (field, a, b) =>
  field === 'weight' ? toNum(a) === toNum(b) : String(a ?? '') === String(b ?? '');

/**
 * plan 스냅샷 대비 카탈로그 편집 감지.
 * 생존자는 이미 apply 가 mergedCatalog 를 기록했을 수 있으므로(재실행/부분 적용)
 * "스냅샷 값" 또는 "mergedCatalog 값" 중 하나와 같으면 편집이 아닌 것으로 본다.
 */
const editedCatalogFields = (current, snapshot, allowed) =>
  CATALOG_COMPARE_FIELDS.filter((f) => {
    if (sameFieldValue(f, current[f], snapshot[f])) {
      return false;
    }

    return !(allowed && f in allowed && sameFieldValue(f, current[f], allowed[f]));
  });

/** plan 그룹 정의가 현재 DB 와 여전히 일치하는지 확인 (manage 인라인 편집 등으로 바뀔 수 있음) */
const checkGroupDefinition = (group, gearById) => {
  const canonical = gearById.get(group.canonicalId);

  if (!canonical) {
    return { ok: false, reason: 'canonical 문서 없음(삭제되었거나 isCustom 전환)' };
  }

  if (canonical.data.isCustom) {
    return { ok: false, reason: 'canonical 문서가 isCustom 으로 변경됨' };
  }

  // 유사 중복 승인 그룹은 멤버들의 dedupeKey 가 애초에 서로 다르므로 canonical 만 확인한다.
  const isNear = group.origin === GroupOrigin.NearDuplicate;
  const expectedKey = group.canonicalKey ?? group.key;

  if (dedupeKey(canonical.data) !== expectedKey) {
    return { ok: false, reason: `canonical 의 중복 키가 변경됨 (${dedupeKey(canonical.data)})` };
  }

  const keyMismatch = group.dupIds
    .map((id) => gearById.get(id))
    .filter((d) => d && (d.data.isCustom || (!isNear && dedupeKey(d.data) !== expectedKey)));

  if (keyMismatch.length) {
    return { ok: false, reason: `dup 의 중복 키가 변경됨: ${keyMismatch.map((d) => d.id).join(', ')}` };
  }

  // 카탈로그 편집 감지 — plan 의 mergedCatalog 를 적용하면 편집이 되돌아가므로 그룹을 건너뛴다.
  const snapshots = new Map((group.docs ?? []).map((d) => [d.id, d]));

  if (snapshots.size === 0) {
    return { ok: false, reason: 'plan 에 문서 스냅샷(docs)이 없어 편집 감지 불가 — --plan 재실행 필요' };
  }

  for (const [id, doc] of [[group.canonicalId, canonical], ...group.dupIds.map((i) => [i, gearById.get(i)])]) {
    if (!doc) {
      continue;
    }

    const snapshot = snapshots.get(id);

    if (!snapshot) {
      return { ok: false, reason: `plan 스냅샷에 없는 문서: ${id} — --plan 재실행 필요` };
    }

    // 생존자만 mergedCatalog 적용을 허용값으로 인정한다(dup 은 apply 가 수정하지 않음).
    const allowed = id === group.canonicalId ? group.mergedCatalog : null;
    const edited = editedCatalogFields(doc.data, snapshot, allowed);

    if (edited.length) {
      return {
        ok: false,
        reason: `plan 이후 카탈로그 편집됨 (${id}: ${edited.join(', ')}) — --plan 재실행·재승인 필요`,
      };
    }
  }

  return { ok: true };
};

/** apply 시작 전 plan 사전 검증 — 버전 불일치·결손 plan 을 쓰기 전에 거부한다 */
const validatePlan = (plan) => {
  if (!plan || typeof plan !== 'object') {
    return 'plan 형식이 올바르지 않습니다';
  }

  if (plan.planVersion !== PLAN_VERSION) {
    return `planVersion 불일치 (plan=${plan.planVersion ?? '없음'}, 필요=${PLAN_VERSION})`;
  }

  if (!Array.isArray(plan.groups)) {
    return 'groups 배열이 없습니다';
  }

  const broken = plan.groups.findIndex(
    (g) =>
      !g ||
      typeof g.key !== 'string' ||
      typeof g.canonicalId !== 'string' ||
      !Array.isArray(g.dupIds) ||
      g.dupIds.length === 0 ||
      !g.mergedCatalog ||
      typeof g.mergedCatalog !== 'object' ||
      !Array.isArray(g.docs) ||
      g.docs.length < 2
  );

  if (broken !== -1) {
    return `그룹 정의 결손 (인덱스 ${broken}: key/canonicalId/dupIds/mergedCatalog/docs 확인)`;
  }

  return null;
};

const runApply = async (dryRun, skipConfirm) => {
  if (!existsSync(PLAN_PATH)) {
    console.error(`[apply] 거부 — plan 파일이 없습니다: ${PLAN_PATH}`);
    console.error('  먼저 --plan 으로 계획을 만들고 리포트를 검토하세요.');
    process.exit(1);
  }

  const plan = JSON.parse(readFileSync(PLAN_PATH, 'utf-8'));
  const planError = validatePlan(plan);

  if (planError) {
    console.error(`[apply] 거부 — plan 을 사용할 수 없습니다: ${planError}`);
    console.error('  --plan 을 다시 실행해 리포트를 재검토·재승인하세요.');
    process.exit(1);
  }

  const definitions = plan.groups.map((g) => ({
    key: g.key,
    canonicalKey: g.canonicalKey ?? g.key,
    origin: g.origin ?? GroupOrigin.Exact,
    canonicalId: g.canonicalId,
    dupIds: g.dupIds,
    newestId: g.newestId,
    mergedCatalog: g.mergedCatalog,
    docs: g.docs,
  }));
  // 고아 삭제 대상(참조 0 인 후보) — apply 가 삭제 직전에 다시 확인한다.
  const orphanTargets = (plan.orphanDeletes ?? []).filter((o) => o.eligible);

  // Phase 1.5 — 리포트 피드백 반영
  const { feedback, error: feedbackError } = loadFeedback();

  if (feedbackError) {
    console.error(`[apply] 거부 — 피드백 파일을 읽을 수 없습니다: ${feedbackError}`);
    console.error(`  ${FEEDBACK_PATH} 를 고치거나 삭제한 뒤 다시 실행하세요.`);
    process.exit(1);
  }

  const excluded = excludedGroupKeys(feedback);

  ensureOutDir();
  console.log(`[apply${dryRun ? ' --dry-run' : ''}] plan 요약`);
  console.log(`  생성 시각: ${new Date(plan.generatedAt).toLocaleString('ko-KR')}`);
  console.log(
    `  중복 그룹: ${definitions.length} (정확 ${definitions.filter((g) => g.origin !== GroupOrigin.NearDuplicate).length} + 유사중복 승인 ${definitions.filter((g) => g.origin === GroupOrigin.NearDuplicate).length}) / 삭제 예정 gear 문서: ${sumBy(definitions, (g) => g.dupIds.length)}`
  );

  if (orphanTargets.length) {
    console.log(`  고아 삭제 예정: ${orphanTargets.length}건 (삭제 직전 참조 0 재확인)`);
  }
  console.log(`  리포트: file://${REPORT_PATH}`);

  if (feedback) {
    console.log(`  피드백: 제외 ${excluded.size}건 / 메모 ${countMemos(feedback)}건 (${FEEDBACK_PATH})`);

    if (feedback.planGeneratedAt !== plan.generatedAt) {
      const message =
        `[apply] 경고 — 피드백이 다른 plan 것입니다 ` +
        `(피드백 ${new Date(feedback.planGeneratedAt).toLocaleString('ko-KR')} ≠ plan ${new Date(plan.generatedAt).toLocaleString('ko-KR')}).` +
        '\n  오래된 제외 결정이 잘못 적용될 수 있습니다.';

      if (skipConfirm) {
        // 자동화 실행에서 오래된 피드백이 조용히 적용되는 사고를 막는다.
        console.error(message);
        console.error('  --yes 실행에서는 진행하지 않습니다. 리포트를 다시 검토해 피드백을 저장하거나 파일을 삭제하세요.');
        process.exit(1);
      }

      await confirmOrExit(message, false);
    }
  }

  if (!dryRun) {
    await confirmOrExit('[apply] 위 plan 의 그룹 정의로 실제 쓰기를 수행합니다 (참조는 지금 재스캔).', skipConfirm);
  }

  const store = init();
  const index = buildGroupIndex(definitions, orphanTargets.map((o) => o.id));

  // 그룹 정의 재확인용 gear 문서 (isCustom 포함해 상태를 그대로 본다)
  console.log('[apply] 그룹 정의 재확인...');

  const gearById = await scanGearByIds(store, index.interesting);
  const globalWeightById = new Map([...gearById].map(([id, d]) => [id, toNum(d.data.weight)]));

  // 참조는 plan 을 신뢰하지 않고 지금 다시 스캔한다 (plan 이후 사용자가 dup 을 담았을 수 있다).
  console.log('[apply] 참조 재스캔...');

  const scan = await scanReferences(store, index, globalWeightById);
  const writer = createWriter(store, dryRun);
  const logs = [];
  const failures = [];
  const definitionSkips = [];
  let aborted = null;

  for (let i = 0; i < definitions.length; i += 1) {
    const group = definitions[i];

    if (excluded.has(group.key)) {
      // 사용자가 리포트에서 제외로 표시한 그룹 — 참조를 건드리지 않고 로그에만 남긴다.
      const log = createExcludedLog(group, feedback);

      logs.push(log);
      console.log(`  [제외] ${group.canonicalId} (${group.key})${log.memo ? ` — ${log.memo}` : ''}`);
      continue;
    }

    const check = checkGroupDefinition(group, gearById);

    if (!check.ok) {
      definitionSkips.push({ key: group.key, canonicalId: group.canonicalId, reason: check.reason });
      console.log(`  [skip] ${group.canonicalId}: ${check.reason}`);
      continue;
    }

    const refs = buildGroupRefs(group, scan);
    const log = createGroupLog(group);

    try {
      await applyGroup(store, group, refs, writer, log);
      logs.push(log);
    } catch (e) {
      log.error = e.message;
      log.partial = true;
      logs.push(log);
      failures.push({ key: group.key, canonicalId: group.canonicalId, error: e.message });

      if (e.isCommitFailure) {
        // 커밋 실패는 부분 상태 — 오염된 상태로 계속 진행하지 않고 전체 중단한다.
        console.error(`  [abort] commit 실패 — 전체 중단: ${e.message}`);
        aborted = e;
        break;
      }

      console.error(`  [fail] ${group.canonicalId} (${group.key}): ${e.message}`);

      // 그룹 실패 시 잔여 op 를 즉시 커밋해 다음 그룹 로그에 섞이지 않게 한다.
      try {
        await writer.flush();
      } catch (flushError) {
        console.error(`  [abort] 잔여 op 커밋 실패 — 전체 중단: ${flushError.message}`);
        aborted = flushError;
        break;
      }
    }

    if ((i + 1) % 50 === 0) {
      console.log(`  진행 ${i + 1}/${definitions.length}`);
    }
  }

  // 고아 삭제 — 그룹 처리가 끝난 뒤 실행한다(참조 재확인이 병합 후 상태를 보게 되어 더 정확).
  let orphanResults = [];

  if (!aborted && orphanTargets.length) {
    console.log(`[apply] 고아 삭제 ${orphanTargets.length}건 검사...`);

    try {
      orphanResults = await applyOrphanDeletes(store, orphanTargets, scan, writer);
    } catch (e) {
      console.error(`  [abort] 고아 삭제 실패: ${e.message}`);
      aborted = e;
    }
  }

  if (!aborted) {
    try {
      await writer.flush();
    } catch (e) {
      console.error(`  [abort] 마지막 커밋 실패: ${e.message}`);
      aborted = e;
    }
  }

  const total = (field) => sumBy(logs, (l) => l[field].length);
  const stats = writer.getStats();
  const summary = {
    mode: dryRun ? 'dry-run' : 'apply',
    startedFromPlanAt: plan.generatedAt,
    finishedAt: Date.now(),
    aborted: aborted ? aborted.message : null,
    groupCount: definitions.length,
    processed: logs.length,
    feedbackPlanGeneratedAt: feedback ? feedback.planGeneratedAt : null,
    excludedByFeedback: logs.filter((l) => l.excludedByFeedback).length,
    nearDuplicateGroups: definitions.filter((g) => g.origin === GroupOrigin.NearDuplicate).length,
    orphanDeleted: orphanResults.filter((o) => o.deleted).map((o) => o.id),
    orphanHeld: orphanResults.filter((o) => !o.deleted).map((o) => ({ id: o.id, reason: o.held })),
    orphanResults,
    definitionSkips,
    opsQueued: stats.queued,
    opsCommitted: stats.committed,
    bagUpdated: total('bagUpdated'),
    templateUpdated: total('templateUpdated'),
    userDocsMoved: total('userDocsMoved'),
    userDocsMerged: total('userDocsMerged'),
    rankMerged: total('rankMerged'),
    reviewMoved: total('reviewMoved'),
    reviewDeleted: total('reviewDeleted'),
    commentsMoved: total('commentsMoved'),
    summaryMerged: total('summaryMerged'),
    commentLikesUpdated: total('commentLikesUpdated'),
    feedUpdated: total('feedUpdated'),
    gearDeleted: total('gearDeleted'),
    weightAdjusted: total('weightAdjusted'),
    conflictUserDocs: total('conflictUserDocs'),
    skippedGroups: logs.filter((l) => l.skipped.length).length,
    failures,
    groups: logs,
  };

  if (dryRun) {
    summary.plannedOps = writer.ops;
  }

  const logPath = join(OUT_DIR, `${APPLY_LOG_PREFIX}${stamp()}.log.json`);

  writeJson(logPath, summary);

  console.log(`\n[apply${dryRun ? ' --dry-run' : ''}] ${aborted ? '중단됨' : '완료'}`);
  console.log(
    `  그룹 처리 ${summary.processed}/${summary.groupCount} (피드백 제외 ${summary.excludedByFeedback}, 정의 불일치 skip ${definitionSkips.length}, 실패 ${failures.length})`
  );
  console.log(`  op 큐 ${stats.queued} / 커밋 ${stats.committed}`);
  console.log(`  bag ${summary.bagUpdated} · 템플릿 ${summary.templateUpdated} · weight 차감 ${summary.weightAdjusted}`);
  console.log(`  창고 이동 ${summary.userDocsMoved} / 병합 ${summary.userDocsMerged} (충돌 표기 ${summary.conflictUserDocs})`);
  console.log(`  gear-rank ${summary.rankMerged} · gear-review ${summary.reviewDeleted}(복사 ${summary.reviewMoved})`);
  console.log(`  댓글 ${summary.commentsMoved} · 요약 ${summary.summaryMerged} · 좋아요 ${summary.commentLikesUpdated} · feed ${summary.feedUpdated}`);
  console.log(`  gear 삭제 ${summary.gearDeleted} · 고아 삭제 ${summary.orphanDeleted.length}(보류 ${summary.orphanHeld.length})`);

  if (dryRun) {
    console.log(`  수행 예정 op ${writer.ops.length}건 (쓰기 없음)`);
    writer.ops.slice(0, 30).forEach((op) => console.log(`    ${op.kind.padEnd(6)} ${op.path}`));

    if (writer.ops.length > 30) {
      console.log(`    ... 외 ${writer.ops.length - 30}건 (로그 파일 참고)`);
    }
  }
  console.log(`\n  ${logPath}`);

  if (aborted) {
    console.error('\n  ※ 커밋 실패로 중단되었습니다. 로그 확인 후 원인 해결하고 재실행하세요(멱등).');
    process.exit(1);
  }
};

// ── PHASE 3: VERIFY ───────────────────────────────────────────────
/** apply 로그 목록 → 검증 대상 (순수 함수) */
const collectVerifyTargets = (logs) => {
  const dupIds = new Set();
  const keys = new Set();
  const notApplied = new Set();

  logs.forEach((log) => {
    if (log.mode === 'dry-run') {
      // 쓰기가 없었으므로 검증 대상이 아니다.
      return;
    }

    (log.orphanDeleted ?? []).forEach((id) => dupIds.add(id));

    (log.groups ?? []).forEach((g) => {
      // 전혀 적용되지 않은 그룹(canonical 부재, 피드백 제외 등)의 dup 은 검증 대상이 아니다 —
      // 포함하면 손댄 적 없는 참조가 영구 FAIL 로 집계된다.
      if (g.notApplied || g.excludedByFeedback) {
        (g.dupIds ?? []).forEach((id) => notApplied.add(id));

        return;
      }

      (g.gearDeleted ?? []).forEach((id) => dupIds.add(id));
      (g.dupIds ?? []).forEach((id) => dupIds.add(id));

      if (g.key) {
        keys.add(g.key);
      }
    });
  });

  // 나중 실행에서 정상 적용된 dup 은 미적용 목록에서 뺀다.
  dupIds.forEach((id) => notApplied.delete(id));

  return { dupIds, keys, notApplied };
};

/** 검증 입력 — apply 로그의 삭제 dup id 합집합, 없으면 plan 폴백 */
const loadVerifyTargets = () => {
  const logFiles = existsSync(OUT_DIR)
    ? readdirSync(OUT_DIR)
        .filter((f) => f.startsWith(APPLY_LOG_PREFIX) && f.endsWith('.log.json'))
        .sort()
    : [];
  const { dupIds, keys, notApplied } = collectVerifyTargets(
    logFiles.map((f) => JSON.parse(readFileSync(join(OUT_DIR, f), 'utf-8')))
  );

  if (dupIds.size > 0 || notApplied.size > 0) {
    return { source: `apply 로그 ${logFiles.length}개`, dupIds, keys, notApplied };
  }

  if (existsSync(PLAN_PATH)) {
    const plan = JSON.parse(readFileSync(PLAN_PATH, 'utf-8'));

    plan.groups.forEach((g) => {
      g.dupIds.forEach((id) => dupIds.add(id));
      keys.add(g.key);
    });

    return { source: 'plan 파일(폴백)', dupIds, keys, notApplied };
  }

  return null;
};

/** Algolia 표본 검증 — 검색 전용 키로 dup objectID 미노출 확인 */
const verifyAlgolia = async (sampleIds) => {
  if (sampleIds.length === 0) {
    return { checked: 0, found: [], error: null };
  }

  try {
    const { liteClient } = await import('algoliasearch/lite');
    const client = liteClient(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
    const { results } = await client.search({
      requests: sampleIds.map((id) => ({
        indexName: ALGOLIA_INDEX,
        query: '',
        filters: `objectID:${id}`,
        hitsPerPage: 1,
      })),
    });
    const found = results.flatMap((res) => (res.hits ?? []).map((h) => h.objectID));

    return { checked: sampleIds.length, found: uniq(found), error: null };
  } catch (e) {
    return { checked: 0, found: [], error: e.message };
  }
};

const runVerify = async () => {
  const targets = loadVerifyTargets();

  if (!targets) {
    console.error('[verify] 거부 — apply 로그도 plan 파일도 없습니다. 검증 대상을 알 수 없습니다.');
    console.error(`  ${OUT_DIR}/${APPLY_LOG_PREFIX}*.log.json 또는 ${PLAN_PATH}`);
    process.exit(1);
  }

  const store = init();
  const { dupIds, keys, notApplied } = targets;

  console.log(`[verify] 검증 입력: ${targets.source} — dup ${dupIds.size}건 / 그룹 키 ${keys.size}건`);

  if (notApplied.size) {
    console.log(`  미적용 그룹의 dup ${notApplied.size}건은 검증 대상에서 제외 (apply 가 건드리지 않음)`);
  }
  console.log('[verify] gear 재스캔...');

  const { docs, total } = await loadGearDocs();
  const { dupGroups } = buildGroups(docs);
  const survivingDupIds = docs.filter((d) => dupIds.has(d.id)).map((d) => d.id);
  // plan 이후 크롤로 생긴 신규 중복과, 처리되지 않은 잔여 중복을 구분한다.
  const leftoverGroups = dupGroups.filter((g) => keys.has(g.key));
  const newGroups = dupGroups.filter((g) => !keys.has(g.key));

  console.log('[verify] users/*/gears 재스캔...');

  const userDupRefs = [];

  await streamQuery(store.collectionGroup(USER_GEARS), 'users/*/gears', (snap) => {
    if (isUserSubDoc(snap) && dupIds.has(snap.id)) {
      userDupRefs.push(`${ownerUid(snap)}/${snap.id}`);
    }
  });

  console.log('[verify] bag 재스캔...');

  const bagDupRefs = [];

  await streamQuery(store.collection(BAG), BAG, (snap) => {
    const gears = Array.isArray(snap.data().gears) ? snap.data().gears : [];
    const hits = gears.filter((gid) => dupIds.has(gid));

    if (hits.length) {
      bagDupRefs.push({ id: snap.id, dupIds: uniq(hits) });
    }
  });

  console.log('[verify] users/*/bagTemplates 재스캔...');

  const templateDupRefs = [];

  await streamQuery(store.collectionGroup(BAG_TEMPLATES), 'users/*/bagTemplates', (snap) => {
    if (!isUserSubDoc(snap)) {
      return;
    }

    const gears = Array.isArray(snap.data().gears) ? snap.data().gears : [];
    const hits = gears.filter((gid) => dupIds.has(gid));

    if (hits.length) {
      templateDupRefs.push({ id: `${ownerUid(snap)}/${snap.id}`, dupIds: uniq(hits) });
    }
  });

  console.log('[verify] gear-rank / gear-review 재스캔...');

  const rankDupRefs = [];
  const reviewDupRefs = [];

  await streamQuery(store.collection(GEAR_RANK), GEAR_RANK, (snap) => {
    if (dupIds.has(snap.id)) {
      rankDupRefs.push(snap.id);
    }
  });

  await streamQuery(store.collection(GEAR_REVIEW), GEAR_REVIEW, (snap) => {
    if (dupIds.has(snap.id)) {
      reviewDupRefs.push(snap.id);
    }
  });

  console.log('[verify] comment-likes / feed-content 재스캔...');

  const likeDupRefs = [];
  const feedDupRefs = [];

  await streamQuery(store.collection(COMMENT_LIKES), COMMENT_LIKES, (snap) => {
    if (dupIds.has(snap.data().gearId)) {
      likeDupRefs.push(snap.id);
    }
  });

  await streamQuery(store.collection(FEED_CONTENT), FEED_CONTENT, (snap) => {
    if (dupIds.has(snap.data().relatedGearId)) {
      feedDupRefs.push(snap.id);
    }
  });

  console.log('[verify] gear-comments 재스캔...');

  const commentDupRefs = [];
  const commentParents = await store.collection(GEAR_COMMENTS).listDocuments();

  for (const ref of commentParents) {
    if (!dupIds.has(ref.id)) {
      continue;
    }

    const summarySnap = await ref.get();
    const commentRefs = await ref.collection(COMMENTS).listDocuments();

    if (summarySnap.exists || commentRefs.length > 0) {
      commentDupRefs.push(`${ref.id} (댓글 ${commentRefs.length}${summarySnap.exists ? ', 요약 문서 존재' : ''})`);
    }
  }

  console.log('[verify] Algolia 표본 검증...');

  const algolia = await verifyAlgolia([...dupIds].slice(0, ALGOLIA_SAMPLE_SIZE));

  const checks = [
    ['잔여 중복 그룹(plan 대상)', leftoverGroups.length],
    ['살아있는 dup gear 문서', survivingDupIds.length],
    ['dup 참조 users/*/gears', userDupRefs.length],
    ['dup 참조 bag', bagDupRefs.length],
    ['dup 참조 bagTemplates', templateDupRefs.length],
    ['dup 참조 gear-rank', rankDupRefs.length],
    ['dup 참조 gear-review', reviewDupRefs.length],
    ['dup 참조 gear-comments 트리', commentDupRefs.length],
    ['dup 참조 comment-likes', likeDupRefs.length],
    ['dup 참조 feed-content', feedDupRefs.length],
    // Algolia 는 조회 자체가 실패하면 검사로 세지 않는다(아래 UNVERIFIED 로 별도 표기).
    ...(algolia.error ? [] : [['Algolia 표본 잔존 objectID', algolia.found.length]]),
  ];

  console.log('\n[verify] 결과');
  console.log(`  전체 gear 문서: ${total}`);
  checks.forEach(([label, n]) => console.log(`  ${label}: ${n} → ${n === 0 ? 'OK' : 'FAIL'}`));

  if (algolia.error) {
    console.log(`  Algolia 표본 검증: UNVERIFIED — 조회 실패로 확인하지 못했습니다 (${algolia.error})`);
  } else {
    console.log(`  Algolia 표본 ${algolia.checked}건 조회 — 인덱스는 Extension 자동 동기화`);
  }
  console.log(`  참고: plan 이후 새로 생긴 중복 그룹 ${newGroups.length}건 (이번 마이그레이션 대상 아님 — 재크롤 원인)`);

  leftoverGroups.slice(0, 20).forEach((g) => console.log(`    [group] ${g.key} → ${g.members.map((m) => m.id).join(', ')}`));
  newGroups.slice(0, 10).forEach((g) => console.log(`    [new-group] ${g.key} → ${g.members.map((m) => m.id).join(', ')}`));
  survivingDupIds.slice(0, 20).forEach((id) => console.log(`    [gear] ${id}`));
  userDupRefs.slice(0, 20).forEach((p) => console.log(`    [user] ${p}`));
  bagDupRefs.slice(0, 20).forEach((b) => console.log(`    [bag] ${b.id} → ${b.dupIds.join(', ')}`));
  templateDupRefs.slice(0, 20).forEach((t) => console.log(`    [template] ${t.id} → ${t.dupIds.join(', ')}`));
  rankDupRefs.slice(0, 20).forEach((id) => console.log(`    [gear-rank] ${id}`));
  reviewDupRefs.slice(0, 20).forEach((id) => console.log(`    [gear-review] ${id}`));
  commentDupRefs.slice(0, 20).forEach((s) => console.log(`    [gear-comments] ${s}`));
  likeDupRefs.slice(0, 20).forEach((id) => console.log(`    [comment-likes] ${id}`));
  feedDupRefs.slice(0, 20).forEach((id) => console.log(`    [feed-content] ${id}`));
  algolia.found.forEach((id) => console.log(`    [algolia] ${id}`));

  const failed = checks.filter(([, n]) => n > 0);

  if (failed.length) {
    console.error(`\n  종합: FAIL — 미해결 항목 ${failed.length}종 (apply 재실행 필요)`);
    process.exit(1);
  }

  console.log(
    `\n  종합: 모든 검사 통과${algolia.error ? ' (경고: Algolia 표본은 UNVERIFIED — 콘솔에서 직접 확인하세요)' : ''}`
  );
};

// ── CLI ───────────────────────────────────────────────────────────
const usage = () => {
  console.error(`Usage: node migrate-dedupe.js <모드> [옵션]

  모드: --backup | --plan | --render | --feedback-server | --apply | --verify | --restore

  --backup                       Phase 0: 전 컬렉션 NDJSON 덤프 → out/dedupe-backup-<ts>/
                                 (plan 이 있으면 gear-comments/comment-likes/feed-content 는 dup 범위만)
  --plan                         Phase 1: 읽기 전용 스캔 → out/dedupe-plan.json + out/dedupe-report.html
  --render                       Phase 1.5: Firestore 접속 없이 기존 plan 으로 리포트만 재생성
  --feedback-server              Phase 1.5: 리포트 피드백 수신 서버 (포트 ${FEEDBACK_PORT}, Firestore 미접속)
                                 → out/dedupe-feedback.json (제외 그룹은 apply 가 건너뜀)
  --apply                        Phase 2: plan 의 그룹 정의로 적용 (참조는 실행 시 재스캔, 멱등)
    --dry-run                    쓰기 없이 수행할 op 목록만 출력
    --yes                        대화형 확인 생략
  --verify                       Phase 3: 재검증 (apply 로그 기준, 실패 시 exit 1)
  --restore --from=<dir>         백업 NDJSON 을 그대로 재기록
    --only=<컬렉션>              특정 파일만 복원 (gear / bag / user-gears ...)
    --yes                        대화형 확인 생략

  모드는 정확히 하나만 지정해야 합니다. Node 20 으로 실행하세요.`);
};

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const s = a.replace(/^--/, '');
      const eq = s.indexOf('=');

      if (eq === -1) {
        return [s, true];
      }

      return [s.slice(0, eq), s.slice(eq + 1)];
    })
);

const MODES = ['backup', 'plan', 'render', 'feedback-server', 'apply', 'verify', 'restore'];
const selected = MODES.filter((m) => flags[m]);

if (selected.length !== 1) {
  usage();
  process.exit(1);
}

const mode = selected[0];

try {
  if (mode === 'backup') {
    await runBackup();
  } else if (mode === 'plan') {
    await runPlan();
  } else if (mode === 'render') {
    runRender();
  } else if (mode === 'feedback-server') {
    await runFeedbackServer();
  } else if (mode === 'apply') {
    await runApply(!!flags['dry-run'], !!flags.yes);
  } else if (mode === 'restore') {
    await runRestore(flags.from === true ? null : flags.from, flags.only === true ? null : flags.only, !!flags.yes);
  } else {
    await runVerify();
  }
  process.exit(0);
} catch (e) {
  console.error(`\n[${mode}] 실패: ${e.stack ?? e.message}`);
  process.exit(1);
}

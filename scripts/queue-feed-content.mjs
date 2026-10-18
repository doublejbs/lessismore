// 추천 박지 대기열 적재 스크립트 (앱 레포 specs/DataModel.md DM-27 "주간 자동 교체", Home.md HM-11).
//   검토를 마친 pool.json의 items를 feed-content에 대기 문서로 넣는다.
//   published: false, rotationState: 'queued', queueOrder — publishedAt·사진 필드는 쓰지 않는다.
//   발행·내림은 스케줄 함수 rotateFeedContent 몫이다(이 스크립트는 발행하지 않는다).
//
//   feed-content 쓰기는 admin 전용이라 firebase-tools 로그인(프로젝트 소유자) OAuth 토큰으로
//   Firestore REST를 호출한다. 먼저 `firebase login`이 되어 있어야 한다.
//
//   실행: node scripts/queue-feed-content.mjs <pool.json>           (DRY-RUN, 쓰기 안 함)
//         node scripts/queue-feed-content.mjs <pool.json> --apply   (feed-content 전체 백업 후 적재)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const PROJECT_ID = 'lessismore-7e070';
const FEED_COLLECTION = 'feed-content';
const CAMP_SPOT_COLLECTION = 'camp-spot';
const SPOT_INTRO_TYPE = 'spot_intro';
const QUEUED_STATE = 'queued';
const DOC_ID_PREFIX = 'rot-';
// firebase-tools CLI의 공개 OAuth 클라이언트 값(데스크톱 앱용, 비밀값 아님).
const OAUTH_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const OAUTH_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
const FIREBASE_TOOLS_CONFIG = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
const DOCUMENTS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const BACKUP_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'backups');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const poolPath = args.find((arg) => !arg.startsWith('--'));

const getAccessToken = async () => {
  const config = JSON.parse(fs.readFileSync(FIREBASE_TOOLS_CONFIG, 'utf8'));
  const refreshToken = config?.tokens?.refresh_token;

  if (!refreshToken) {
    throw new Error('firebase-tools 로그인 토큰이 없습니다. `firebase login` 후 다시 실행하세요.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
    }),
  });
  const body = await response.json();

  if (!body.access_token) {
    throw new Error(`액세스 토큰 발급 실패: ${JSON.stringify(body)}`);
  }

  return body.access_token;
};

const decodeValue = (value) => {
  const [kind, raw] = Object.entries(value)[0];

  if (kind === 'mapValue') {
    return decodeFields(raw.fields || {});
  }

  if (kind === 'arrayValue') {
    return (raw.values || []).map(decodeValue);
  }

  if (kind === 'integerValue') {
    return Number(raw);
  }

  if (kind === 'nullValue') {
    return null;
  }

  return raw;
};

const decodeFields = (fields) => {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
};

const encodeValue = (value) => {
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }

  return { stringValue: String(value) };
};

const createClient = (accessToken) => {
  const request = async (url, init = {}) => {
    return fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Goog-User-Project': PROJECT_ID,
        'content-type': 'application/json',
        ...(init.headers || {}),
      },
    });
  };

  const listCollection = async (collection) => {
    const documents = [];
    let pageToken = '';

    do {
      const query = `pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
      const response = await request(`${DOCUMENTS_BASE}/${collection}?${query}`);
      const body = await response.json();

      if (!response.ok) {
        throw new Error(`${collection} 조회 실패: ${JSON.stringify(body.error || body)}`);
      }

      (body.documents || []).forEach((document) => {
        documents.push({
          id: document.name.split('/').pop(),
          ...decodeFields(document.fields || {}),
          _rawFields: document.fields || {},
        });
      });
      pageToken = body.nextPageToken || '';
    } while (pageToken);

    return documents;
  };

  const getDocument = async (collection, id) => {
    const response = await request(`${DOCUMENTS_BASE}/${collection}/${encodeURIComponent(id)}`);

    if (response.status === 404) {
      return null;
    }

    const body = await response.json();

    if (!response.ok) {
      throw new Error(`${collection}/${id} 조회 실패: ${JSON.stringify(body.error || body)}`);
    }

    return decodeFields(body.fields || {});
  };

  // documentId를 지정해 생성한다. 이미 있으면 409로 실패하므로 덮어쓰지 않는다.
  const createDocument = async (collection, id, data) => {
    const fields = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeValue(value)]));
    const response = await request(`${DOCUMENTS_BASE}/${collection}?documentId=${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify({ fields }),
    });

    if (response.status === 409) {
      return { created: false };
    }

    if (!response.ok) {
      const body = await response.json();

      throw new Error(`${collection}/${id} 생성 실패: ${JSON.stringify(body.error || body)}`);
    }

    return { created: true };
  };

  return { listCollection, getDocument, createDocument };
};

const validateItem = (item, index) => {
  const problems = [];

  if (typeof item.queueOrder !== 'number' || !Number.isFinite(item.queueOrder)) {
    problems.push('queueOrder가 숫자가 아님');
  }

  if (item.type !== SPOT_INTRO_TYPE) {
    problems.push(`type이 ${SPOT_INTRO_TYPE}가 아님`);
  }

  ['title', 'summary', 'relatedSpotId'].forEach((key) => {
    if (typeof item[key] !== 'string' || item[key].trim() === '') {
      problems.push(`${key} 비어 있음`);
    }
  });

  if (problems.length > 0) {
    throw new Error(`items[${index}] 검증 실패: ${problems.join(', ')}`);
  }
};

const run = async () => {
  if (!poolPath) {
    console.error('사용법: node scripts/queue-feed-content.mjs <pool.json> [--apply]');
    process.exit(1);
  }

  console.log(`모드: ${APPLY ? 'APPLY (실제 쓰기)' : 'DRY-RUN (쓰기 안 함)'}\n`);

  const pool = JSON.parse(fs.readFileSync(poolPath, 'utf8'));
  const items = Array.isArray(pool) ? pool : pool.items;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('pool.json에 items가 없습니다.');
  }

  items.forEach(validateItem);

  const client = createClient(await getAccessToken());
  const existing = await client.listCollection(FEED_COLLECTION);
  const featuredSpotIds = new Set(existing.map((document) => document.relatedSpotId).filter(Boolean));
  const queuedDocuments = existing.filter((document) => document.rotationState === QUEUED_STATE);
  const queuedOrders = new Set(queuedDocuments.map((document) => document.queueOrder));
  const maxQueuedOrder = queuedDocuments.reduce((max, document) => {
    return typeof document.queueOrder === 'number' ? Math.max(max, document.queueOrder) : max;
  }, -Infinity);
  const poolOrders = items.map((item) => item.queueOrder);
  const duplicatedOrders = poolOrders.filter((order, index) => poolOrders.indexOf(order) !== index);

  console.log(`기존 feed-content ${existing.length}건 (대기 ${queuedDocuments.length}건)`);

  if (duplicatedOrders.length > 0) {
    console.log(`주의: pool 안에 같은 queueOrder가 있습니다 — ${[...new Set(duplicatedOrders)].join(', ')}`);
  }

  if (APPLY) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const backupPath = path.join(BACKUP_DIR, `backup-feed-content-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);

    fs.writeFileSync(backupPath, JSON.stringify(existing, null, 2));
    console.log(`백업 저장: ${backupPath}`);
  } else {
    console.log(`백업 위치(--apply 시): ${BACKUP_DIR}/backup-feed-content-<시각>.json`);
  }

  console.log('');

  const sorted = [...items].sort((a, b) => a.queueOrder - b.queueOrder);
  const seenSpotIds = new Set();
  let createdCount = 0;
  let skippedCount = 0;

  for (const item of sorted) {
    const label = `[${item.queueOrder}] ${item.title}`;

    if (featuredSpotIds.has(item.relatedSpotId) || seenSpotIds.has(item.relatedSpotId)) {
      console.log(`  건너뜀 ${label} — 이미 feed-content에 있는 박지(${item.relatedSpotId})`);
      skippedCount += 1;
      continue;
    }

    seenSpotIds.add(item.relatedSpotId);

    const spot = await client.getDocument(CAMP_SPOT_COLLECTION, item.relatedSpotId);

    if (!spot || spot.status !== 'active') {
      console.log(`  건너뜀 ${label} — camp-spot 문서 없음 또는 비활성(${item.relatedSpotId})`);
      skippedCount += 1;
      continue;
    }

    if (item.queueOrder < maxQueuedOrder) {
      console.log(`  주의 ${label} — 기존 대기열 최댓값(${maxQueuedOrder})보다 앞에 끼어듭니다`);
    }

    if (queuedOrders.has(item.queueOrder)) {
      console.log(`  주의 ${label} — 기존 대기 문서와 queueOrder가 같습니다(문서 ID 순으로 발행)`);
    }

    const docId = `${DOC_ID_PREFIX}${item.relatedSpotId}`;
    const payload = {
      type: SPOT_INTRO_TYPE,
      title: item.title.trim(),
      summary: item.summary.trim(),
      relatedSpotId: item.relatedSpotId,
      published: false,
      rotationState: QUEUED_STATE,
      queueOrder: item.queueOrder,
    };

    console.log(`  적재 ${label} → ${spot.name} (${docId})`);

    if (!APPLY) {
      continue;
    }

    const result = await client.createDocument(FEED_COLLECTION, docId, payload);

    if (result.created) {
      createdCount += 1;
    } else {
      console.log(`    건너뜀 — ${docId} 문서가 이미 있습니다`);
      skippedCount += 1;
    }
  }

  console.log(`\n완료: ${APPLY ? `생성 ${createdCount}건` : '쓰기 없음'}, 건너뜀 ${skippedCount}건`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

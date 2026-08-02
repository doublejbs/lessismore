import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync } from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const KEY_PATH = process.env.FIREBASE_SERVICE_ACCOUNT
  ? process.env.FIREBASE_SERVICE_ACCOUNT
  : join(__dirname, 'serviceAccountKey.json');

let db;
const init = () => {
  if (db) return db;
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

const col = () => init().collection('gear');

// ── IMAGE UPLOAD ──────────────────────────────────────────────────
const isStorageUrl = (url) =>
  url && url.includes('firebasestorage.googleapis.com');

const uploadImageToStorage = async (imageUrl, docId) => {
  if (!imageUrl || isStorageUrl(imageUrl)) return imageUrl;
  try {
    const resp = await fetch(imageUrl);
    if (!resp.ok) return imageUrl;
    const buffer = Buffer.from(await resp.arrayBuffer());
    const ct = resp.headers.get('content-type') ?? 'image/jpeg';
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
    const token = uuidv4();
    const path = `gears/${docId}.${ext}`;
    const file = getStorage().bucket().file(path);
    await file.save(buffer, {
      contentType: ct,
      metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    });
    const bucket = getStorage().bucket().name;
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
  } catch (e) {
    console.log(`[img] upload failed (${docId}): ${e.message}`);
    return imageUrl;
  }
};

// ── FIRESTORE ─────────────────────────────────────────────────────
const findExisting = async (gear) => {
  const c = col();

  if (gear.groupId) {
    const snap = await c
      .where('groupId', '==', gear.groupId)
      .where('color', '==', gear.color ?? '')
      .where('size', '==', gear.size ?? '')
      .limit(1)
      .get();
    if (!snap.empty) return snap.docs[0];
  }

  if (gear.nameKorean) {
    // color 뿐 아니라 size 도 포함해야 한다. 같은 제품명+색상인데 사이즈만 다른 변형이
    // size 를 안 보는 이 매칭으로 같은 doc 에 겹쳐써지는 사고가 실제로 있었다(블랙다이아몬드
    // 502개 그룹에서 사이즈 변형이 유실됨 — bulkUpsert 가 5개씩 동시처리하다보니 앞선
    // 사이즈가 아직 인덱싱되기 전엔 정상 insert 되다가도, 이미 insert 된 앞 사이즈 doc 을
    // 나중 배치의 다른 사이즈 row 가 size 없는 이 쿼리로 찾아내 덮어씀).
    const snap = await c
      .where('nameKorean', '==', gear.nameKorean)
      .where('company', '==', gear.company)
      .where('color', '==', gear.color ?? '')
      .where('size', '==', gear.size ?? '')
      .limit(1)
      .get();
    if (!snap.empty) return snap.docs[0];

    const legacy = await c
      .where('name', '==', gear.nameKorean)
      .where('company', '==', gear.company)
      .where('color', '==', gear.color ?? '')
      .where('size', '==', gear.size ?? '')
      .limit(1)
      .get();
    if (!legacy.empty) return legacy.docs[0];
  }

  if (gear.name) {
    // color/size 를 모두 포함해야 한다. 색상·사이즈만 다른 변형들이 name+company 로만
    // 매칭되면 같은 doc 으로 덮어써져 변형이 합쳐진다(데이터 손실).
    const snap = await c
      .where('name', '==', gear.name)
      .where('company', '==', gear.company)
      .where('color', '==', gear.color ?? '')
      .where('size', '==', gear.size ?? '')
      .limit(1)
      .get();
    if (!snap.empty) return snap.docs[0];
  }

  return null;
};

export const upsertGear = async (gear) => {
  const existing = await findExisting(gear);
  const docId = existing ? existing.id : uuidv4();

  // Upload image only if external URL (skip re-upload for existing Storage URLs)
  const existingImageUrl = existing?.data()?.imageUrl ?? '';
  const imageUrl = isStorageUrl(existingImageUrl)
    ? existingImageUrl
    : await uploadImageToStorage(gear.imageUrl, docId);

  const catalogFields = {
    company: gear.company,
    companyKorean: gear.companyKorean ?? '',
    name: gear.name ?? '',
    nameKorean: gear.nameKorean ?? '',
    color: gear.color ?? '',
    colorKorean: gear.colorKorean ?? '',
    size: gear.size ?? '',
    sizeKorean: gear.sizeKorean ?? '',
    weight: gear.weight ?? 0,
    imageUrl,
    category: gear.category,
    groupId: gear.groupId ?? '',
    productUrl: gear.productUrl ?? '',
  };

  if (existing) {
    const data = existing.data();
    const merged = {
      ...data,
      ...catalogFields,
      companyKorean: gear.companyKorean || data.companyKorean || '',
      specs: { ...(data.specs ?? {}), ...(gear.specs ?? {}) },
    };
    await existing.ref.set(merged);
    return { action: 'updated', id: existing.id };
  }

  const doc = {
    id: docId,
    ...catalogFields,
    isCustom: false,
    useless: [],
    used: [],
    bags: [],
    createDate: Date.now(),
    specs: gear.specs ?? {},
  };
  await col().doc(docId).set(doc);
  return { action: 'inserted', id: docId };
};

export const bulkUpsert = async (gears) => {
  const results = { inserted: 0, updated: 0, failed: [] };
  // Process 5 concurrent to avoid Storage rate limits
  const BATCH = 5;
  for (let i = 0; i < gears.length; i += BATCH) {
    const chunk = gears.slice(i, i + BATCH);
    await Promise.all(
      chunk.map(async (gear) => {
        try {
          const r = await upsertGear(gear);
          results[r.action] += 1;
        } catch (e) {
          results.failed.push({ gear, error: e.message });
        }
      })
    );
  }
  return results;
};

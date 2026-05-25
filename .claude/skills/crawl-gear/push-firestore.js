import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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
    const serviceAccount = JSON.parse(readFileSync(KEY_PATH, 'utf-8'));
    initializeApp({ credential: cert(serviceAccount) });
  }
  db = getFirestore();
  return db;
};

const gearsCol = (adminUid) => init().collection('users').doc(adminUid).collection('gears');

// Variant match: same product (groupId), same color + size = same variant.
// Fallback for legacy data: match by nameKorean against existing name field
// (old records stored Korean text in `name`).
const findExistingVariant = async (adminUid, gear) => {
  const col = gearsCol(adminUid);

  if (gear.groupId) {
    const snap = await col
      .where('groupId', '==', gear.groupId)
      .where('color', '==', gear.color ?? '')
      .where('size', '==', gear.size ?? '')
      .limit(1)
      .get();
    if (!snap.empty) return snap.docs[0];
  }

  if (gear.nameKorean) {
    const snap = await col
      .where('nameKorean', '==', gear.nameKorean)
      .where('company', '==', gear.company)
      .where('color', '==', gear.color ?? '')
      .limit(1)
      .get();
    if (!snap.empty) return snap.docs[0];

    const legacy = await col
      .where('name', '==', gear.nameKorean)
      .where('company', '==', gear.company)
      .limit(1)
      .get();
    if (!legacy.empty) return legacy.docs[0];
  }

  if (gear.name) {
    const snap = await col
      .where('name', '==', gear.name)
      .where('company', '==', gear.company)
      .limit(1)
      .get();
    if (!snap.empty) return snap.docs[0];
  }

  return null;
};

export const upsertGear = async (adminUid, gear) => {
  const existing = await findExistingVariant(adminUid, gear);

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
    imageUrl: gear.imageUrl ?? '',
    category: gear.category,
    groupId: gear.groupId ?? '',
  };

  if (existing) {
    const data = existing.data();
    const merged = {
      ...data,
      ...catalogFields,
      imageUrl: gear.imageUrl || data.imageUrl || '',
      companyKorean: gear.companyKorean || data.companyKorean || '',
      specs: { ...(data.specs ?? {}), ...(gear.specs ?? {}) },
    };
    await existing.ref.set(merged);
    return { action: 'updated', id: existing.id };
  }

  const id = uuidv4();
  const doc = {
    id,
    ...catalogFields,
    isCustom: false,
    useless: [],
    used: [],
    bags: [],
    createDate: Date.now(),
    specs: gear.specs ?? {},
  };
  await gearsCol(adminUid).doc(id).set(doc);
  return { action: 'inserted', id };
};

export const bulkUpsert = async (adminUid, gears) => {
  const results = { inserted: 0, updated: 0, failed: [] };
  for (const gear of gears) {
    try {
      const r = await upsertGear(adminUid, gear);
      results[r.action] += 1;
    } catch (e) {
      results.failed.push({ gear, error: e.message });
    }
  }
  return results;
};

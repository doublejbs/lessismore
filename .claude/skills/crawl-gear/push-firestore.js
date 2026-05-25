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

const col = () => init().collection('gear');

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
    const snap = await c
      .where('nameKorean', '==', gear.nameKorean)
      .where('company', '==', gear.company)
      .where('color', '==', gear.color ?? '')
      .limit(1)
      .get();
    if (!snap.empty) return snap.docs[0];

    const legacy = await c
      .where('name', '==', gear.nameKorean)
      .where('company', '==', gear.company)
      .limit(1)
      .get();
    if (!legacy.empty) return legacy.docs[0];
  }

  if (gear.name) {
    const snap = await c
      .where('name', '==', gear.name)
      .where('company', '==', gear.company)
      .limit(1)
      .get();
    if (!snap.empty) return snap.docs[0];
  }

  return null;
};

export const upsertGear = async (gear) => {
  const existing = await findExisting(gear);

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
  await col().doc(id).set(doc);
  return { action: 'inserted', id };
};

export const bulkUpsert = async (gears) => {
  const results = { inserted: 0, updated: 0, failed: [] };
  for (const gear of gears) {
    try {
      const r = await upsertGear(gear);
      results[r.action] += 1;
    } catch (e) {
      results.failed.push({ gear, error: e.message });
    }
  }
  return results;
};

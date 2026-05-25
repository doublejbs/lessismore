// Local config — stores ADMIN_UID so you don't have to set it every run.
// Saved to .config.local.json (gitignored).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '.config.local.json');

// UIDs that have admin access (from src/manage/ManageView.tsx ALLOWED_UIDS)
const ALLOWED_UIDS = ['M3yk9SzrGZN3veiyd2SE6LmTrsk1', 'KkmaLpxPYLbmJKGkSTLMuMcD5l82'];

export const getAdminUid = () => {
  if (process.env.ADMIN_UID) return process.env.ADMIN_UID;
  if (existsSync(CONFIG_PATH)) {
    try { return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')).adminUid ?? ''; } catch {}
  }
  return '';
};

// Auto-detect admin UID: query Firestore users collection, find the one in ALLOWED_UIDS.
// Called once when serviceAccountKey.json exists but no UID is configured.
export const autoDetectAndSaveAdminUid = async () => {
  try {
    const { initializeApp, cert, getApps } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const KEY_PATH = join(__dirname, 'serviceAccountKey.json');
    if (!existsSync(KEY_PATH)) return '';
    if (getApps().length === 0) {
      const sa = JSON.parse(readFileSync(KEY_PATH, 'utf-8'));
      initializeApp({ credential: cert(sa) });
    }
    const db = getFirestore();
    // Find which ALLOWED_UID has an existing user document
    for (const uid of ALLOWED_UIDS) {
      const doc = await db.collection('users').doc(uid).get();
      if (doc.exists) {
        saveAdminUid(uid);
        return uid;
      }
    }
    // Fallback: use first ALLOWED_UID
    saveAdminUid(ALLOWED_UIDS[0]);
    return ALLOWED_UIDS[0];
  } catch {
    return '';
  }
};

export const saveAdminUid = (uid) => {
  const existing = existsSync(CONFIG_PATH)
    ? (() => { try { return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')); } catch { return {}; } })()
    : {};
  writeFileSync(CONFIG_PATH, JSON.stringify({ ...existing, adminUid: uid }, null, 2));
};

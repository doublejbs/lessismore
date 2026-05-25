// Local config — stores ADMIN_UID so you don't have to set it every run.
// Saved to .config.local.json (gitignored).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '.config.local.json');

export const getAdminUid = () => {
  if (process.env.ADMIN_UID) return process.env.ADMIN_UID;
  if (existsSync(CONFIG_PATH)) {
    try { return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')).adminUid ?? ''; } catch {}
  }
  return '';
};

export const saveAdminUid = (uid) => {
  const existing = existsSync(CONFIG_PATH)
    ? (() => { try { return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')); } catch { return {}; } })()
    : {};
  writeFileSync(CONFIG_PATH, JSON.stringify({ ...existing, adminUid: uid }, null, 2));
};

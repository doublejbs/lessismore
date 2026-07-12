import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { readFileSync } from 'node:fs';
import { bulkUpsert } from './push-firestore.js';
import { CATEGORY_KEYS, CATEGORY_LABELS } from './specs-schema.js';
import { getAdminUid } from './config-local.js';

const args = process.argv.slice(2);
const jsonPath = args[0];
const flags = Object.fromEntries(
  args
    .slice(1)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? true];
    })
);

if (!jsonPath) {
  console.error('Usage: node push.js <json-path> [--dry-run]');
  process.exit(1);
}

const adminUid = getAdminUid();

const gears = JSON.parse(readFileSync(jsonPath, 'utf-8'));
console.log(`Loaded ${gears.length} items from ${jsonPath}\n`);

const rl = readline.createInterface({ input, output });
const isInteractive = process.stdin.isTTY;
const ask = async (q, fallback = '') => {
  if (!isInteractive) {
    console.log(`${q}[non-interactive → "${fallback}"]`);
    return fallback;
  }
  return rl.question(q);
};

const uniqueCompanies = Array.from(new Set(gears.map((g) => g.company)));
const koreanByCompany = {};
for (const c of uniqueCompanies) {
  const sample = gears.find((g) => g.company === c);
  const existing = sample?.companyKorean ?? '';
  const a = (await ask(`"${c}"의 한글 회사명${existing ? ` (현재: ${existing})` : ''}? `, existing)).trim();
  koreanByCompany[c] = a || existing;
}

const bySource = {};
for (const item of gears) {
  const key = item._source ?? '(no source)';
  bySource[key] = bySource[key] ?? [];
  bySource[key].push(item);
}

const categoryOverrides = {};
console.log(`\nAvailable categories: ${CATEGORY_KEYS.join(', ')}\n`);
for (const [source, items] of Object.entries(bySource)) {
  const currentCategory = items[0].category ?? 'etc';
  const label = CATEGORY_LABELS[currentCategory] ?? currentCategory;
  console.log(`Source: ${source}`);
  console.log(`  ${items.length} items, e.g. "${items[0].nameKorean || items[0].name}"`);
  console.log(`  current category: ${currentCategory} (${label})`);
  const a = (await ask(`  → keep "${currentCategory}" or enter new: `, currentCategory)).trim();
  categoryOverrides[source] = a || currentCategory;
}

rl.close();

const finalGears = gears.map((g) => ({
  company: g.company,
  companyKorean: koreanByCompany[g.company] ?? g.companyKorean ?? '',
  name: g.name ?? '',
  nameKorean: g.nameKorean ?? '',
  color: g.color ?? '',
  colorKorean: g.colorKorean ?? '',
  size: g.size ?? '',
  sizeKorean: g.sizeKorean ?? '',
  weight: g.weight ?? 0,
  imageUrl: g.imageUrl ?? '',
  category: categoryOverrides[g._source ?? '(no source)'] ?? g.category ?? 'etc',
  groupId: g.groupId ?? '',
  productUrl: g._detailUrl ?? '',
  specs: g.specs ?? {},
}));

console.log(`\nReady to upsert ${finalGears.length} gears.`);
console.log('Sample:', JSON.stringify(finalGears[0], null, 2));

if (flags['dry-run']) {
  console.log('\n[dry-run] Skipping Firestore write.');
  process.exit(0);
}

console.log(`\nWriting to gear ...`);
const result = await bulkUpsert(finalGears);
console.log(`\nDone. inserted=${result.inserted} updated=${result.updated} failed=${result.failed.length}`);
if (result.failed.length > 0) {
  console.log('Failures:', JSON.stringify(result.failed.slice(0, 5), null, 2));
}

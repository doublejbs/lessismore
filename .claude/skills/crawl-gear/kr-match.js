// Match crawled S2S products (English) to KR reference by English-name token overlap.
// Outputs top-3 KR candidates per unique product → out/kr-match-candidates.json + console table.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'out');

const crawlFile = process.argv[2] ||
  readdirSync(outDir).filter((f) => /^sea-to-summit-\d+\.json$/.test(f)).sort().at(-1);
const crawl = JSON.parse(readFileSync(join(outDir, crawlFile)));
const ref = JSON.parse(readFileSync(join(outDir, 'seatosummit-kr-ref.json')));

// Only truly generic words dropped — keep distinguishing nouns (pot/mug/bowl/spork...).
const STOP = new Set(['the', 'with', 'and', 'a', 'of', 'for', 's2s', 'sea', 'to', 'summit', 'past', 'season', 'new', 'piece']);

const norm = (s) =>
  (s || '').toLowerCase().replace(/[^a-z0-9°]+/g, ' ').split(/\s+/).filter((t) => t && !STOP.has(t));
const tokenSet = (s) => new Set(norm(s));

// Jaccard similarity
const score = (a, b) => {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
};

const products = new Map();
for (const it of crawl) {
  if (products.has(it.groupId)) continue;
  let base = it.name;
  if (it.size && base.endsWith(' ' + it.size)) base = base.slice(0, -(it.size.length + 1));
  products.set(it.groupId, { groupId: it.groupId, base, category: it.category });
}

const refTokens = ref.filter((r) => r.en).map((r) => ({ ...r, tk: tokenSet(r.en) }));

const result = [];
for (const p of products.values()) {
  const tk = tokenSet(p.base);
  const scored = refTokens
    .map((r) => ({ s: +score(tk, r.tk).toFixed(2), en: r.en, ko: r.ko, code: r.code }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);
  result.push({ groupId: p.groupId, category: p.category, base: p.base, candidates: scored });
}

result.sort((a, b) => a.category.localeCompare(b.category) || a.base.localeCompare(b.base));
writeFileSync(join(outDir, 'kr-match-candidates.json'), JSON.stringify(result, null, 2));

for (const r of result) {
  console.log(`\n[${r.category}] ${r.base}`);
  for (const c of r.candidates) console.log(`   ${c.s}  ${(c.en || '').slice(0, 34).padEnd(35)} → ${c.ko}`);
}
console.log(`\n총 ${result.length} 제품 → out/kr-match-candidates.json`);

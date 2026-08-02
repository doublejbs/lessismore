// Build a Korean-name reference from the official KR distributor (montbell.co.kr).
// Each product: { it_id, ko }  where ko is the full KR listing name, e.g.
//   "플라즈마 1000 다운 자켓 남 BLACK"  (model + 남/여 gender + trailing English color)
// montbell.co.kr has NO global product code and NO English model name on its pages,
// so matching to the US (montbell.com) crawl is done later by transliteration + color
// (see kr-apply-montbell.js). Saved → out/montbell-kr-ref.json.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://www.montbell.co.kr';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const fetchT = async (u) => {
  const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko' } });
  return r.text();
};

// <div class="model">IT_ID</div><div class="name">한글명 ... COLOR</div>
const parseList = (html) =>
  [...html.matchAll(/<div class="model">([A-Z0-9]+)<\/div>\s*<div class="name"[^>]*>([^<]+)<\/div>/g)]
    .map((m) => ({ it_id: m[1], ko: m[2].replace(/\s+/g, ' ').trim() }));

// Collect every ca_id from the homepage nav, then keep only leaf categories
// (an id that is not a strict prefix of any other id) to avoid redundant crawls.
const discoverLeafCategories = async () => {
  const html = await fetchT(`${BASE}/`);
  const ids = [...new Set([...html.matchAll(/list\.php\?ca_id=([a-z0-9]+)/gi)].map((m) => m[1]))];
  const leaves = ids.filter((id) => !ids.some((other) => other !== id && other.startsWith(id)));
  return leaves;
};

const main = async () => {
  const cats = await discoverLeafCategories();
  console.log(`[kr] ${cats.length} leaf categories`);

  const byId = new Map();
  for (const ca of cats) {
    let added = 0;
    for (let page = 1; page <= 30; page++) {
      let html;
      try { html = await fetchT(`${BASE}/shop/list.php?ca_id=${ca}&page=${page}`); } catch { break; }
      const items = parseList(html);
      if (items.length === 0) break;
      const before = byId.size;
      items.forEach((it) => { if (!byId.has(it.it_id)) byId.set(it.it_id, it.ko); });
      added += byId.size - before;
      // page yielded nothing new → end of this category's pagination
      if (byId.size === before) break;
      await new Promise((r) => setTimeout(r, 150));
    }
    console.log(`[kr] ${ca}: +${added} (total ${byId.size})`);
  }

  const products = [...byId.entries()].map(([it_id, ko]) => ({ it_id, ko }));
  const outPath = join(__dirname, 'out', 'montbell-kr-ref.json');
  writeFileSync(outPath, JSON.stringify(products, null, 2));
  console.log(`\n[kr] saved ${products.length} products → ${outPath}`);
};

main();

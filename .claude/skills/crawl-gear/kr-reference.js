// Build a Korean-name reference from the official KR importer (seatosummit.co.kr / 니오).
// For each product: { code, ko (Korean name), en (English model name from detail page) }.
// Saved to out/seatosummit-kr-ref.json — used to fill nameKorean by English-name matching.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const fetchT = async (u) => {
  const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko' } });
  return r.text();
};

// Leaf categories that bear products and map to our crawl set.
const CATEGORY_IDS = [
  33, 34, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
  52, 54, 59, 60, 61, 62, 63, 64, 72, 81, 89, 91, 109, 110, 250,
];

const listUrl = (id, page) =>
  `https://www.seatosummit.co.kr/brandsite/index.jsp?BC_ID_pg=${id}&pagename=list&pageNum=${page}`;
const detailUrl = (code) =>
  `https://www.seatosummit.co.kr/brandsite/index_list.jsp?BC_ID_pg=0&pagename=content&pageNum=1&p_code=${code}`;

// (p_code, koreanName) pairs from a list page
const parseList = (html) => {
  const re = /p_code=([A-Z0-9]+)"\s*\/>\s*<img[^>]*>\s*<div itemprop="text">([^<]+)<\/div>/g;
  return [...html.matchAll(re)].map((m) => ({ code: m[1], ko: m[2].trim() }));
};

// English model name from a detail page
const MODEL_HINT = /(Ether|Comfort|Ultralight|Ascent|Spark|Aeros|Telos|Alto|Ikos|Frontier|Detour|Passage|Pursuit|Camp|Boab|Hamelin|Cinder|Ember|Basecamp|Explore|Amplitude|Alpine|Altitude|Reactor|Adaptor|Expander|Escapist|Evac|Big River|Lightweight|Hydraulic|eVent|eVac|Nano|Mosquito|Sigma|Alpha|Delta|X-|X[- ]?Pot|X[- ]?Mug|X[- ]?Bowl|X[- ]?Plate|X[- ]?Cup|Collapsible|Watercell|Pack Tap|Wilderness|Trek|Tek|DryLite|Airlite|Pocket|Coolmax|Reactor|Thermolite|Premium|Traveller|Deluxe|Vapor|Hydration)[A-Za-z0-9 \-\/\+&'.]{1,55}/g;
const parseEnglish = (html) => {
  const m = [...html.matchAll(MODEL_HINT)].map((x) => x[0].trim());
  return [...new Set(m)][0] ?? '';
};

const main = async () => {
  const seen = new Set();
  const products = [];

  for (const id of CATEGORY_IDS) {
    for (let page = 1; page <= 20; page++) {
      let html;
      try { html = await fetchT(listUrl(id, page)); } catch { break; }
      const items = parseList(html);
      const fresh = items.filter((it) => !seen.has(it.code));
      if (items.length === 0) break;
      fresh.forEach((it) => { seen.add(it.code); products.push({ ...it, cat: id }); });
      // stop when a page yields no new codes (end of pagination)
      if (fresh.length === 0) break;
    }
    console.log(`[kr] cat ${id}: total ${products.length}`);
  }

  console.log(`[kr] fetching English names for ${products.length} products...`);
  let i = 0;
  for (const p of products) {
    i++;
    if (i % 25 === 0 || i === products.length) console.log(`[kr]   detail ${i}/${products.length}`);
    try {
      const d = await fetchT(detailUrl(p.code));
      p.en = parseEnglish(d);
    } catch { p.en = ''; }
  }

  const outPath = join(__dirname, 'out', 'seatosummit-kr-ref.json');
  writeFileSync(outPath, JSON.stringify(products, null, 2));
  console.log(`\n[kr] saved ${products.length} products → ${outPath}`);
  console.log(`[kr] with English name: ${products.filter((p) => p.en).length}`);
};

main();

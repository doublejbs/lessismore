// Re-collect _specImages with the broadened rule (koveaimage CDN + /web/upload detail),
// recovering products whose description images live outside the koveaimage CDN.
// Usage: node kovea-reimages.js <json> [out]
import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
const BASE = 'https://www.kovea.co.kr';

const collect = async (no) => {
  try {
    const html = await (await fetch(`${BASE}/product/x/${no}/`, { headers: { 'User-Agent': UA } })).text();
    const imgs = [];
    for (const m of html.matchAll(/koveaimage\.cafe24\.com\/[^"'\s)]+\.(?:jpg|jpeg|png)/gi)) imgs.push('https://' + m[0]);
    for (const m of html.matchAll(/(?:src|ec-data-src)=["']([^"']*?\/web\/upload\/[^"']+\.(?:jpg|jpeg|png))/gi)) {
      let u = m[1];
      if (/\/category\/|icon|menu|btn|common|custom_\d|sns_|logo/i.test(u)) continue;
      if (u.startsWith('//')) u = 'https:' + u; else if (u.startsWith('/')) u = BASE + u;
      imgs.push(u);
    }
    return [...new Set(imgs)];
  } catch { return null; }
};

const main = async () => {
  const path = process.argv[2];
  const out = process.argv[3] || path;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let gained = 0;
  for (let i = 0; i < data.length; i++) {
    const it = data[i];
    const no = it._productNo || (it.groupId || '').replace('kovea_', '');
    const before = (it._specImages || []).length;
    const imgs = await collect(no);
    if (imgs && imgs.length) {
      it._specImages = imgs;
      if (before === 0 && imgs.length > 0) gained++;
    }
    if ((i + 1) % 25 === 0 || i + 1 === data.length) console.log(`[reimages] ${i + 1}/${data.length} (0→N gained: ${gained})`);
  }
  writeFileSync(out, JSON.stringify(data, null, 2));
  console.log(`\n저장: ${out}  (이미지 새로 확보: ${gained})`);
};

main();

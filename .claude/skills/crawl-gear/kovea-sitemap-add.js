// Add products that the category crawl missed (discontinued / refurb / non-major nav
// categories) using the sitemap as the complete product list (incl. sold-out).
// Sitemap has no category, so products are classified by NAME keyword (reliable for
// Kovea: the Korean name states the type). Only major types are kept; products already
// in the input JSON are skipped. New items get weight:0/specs:{} → run the spec pipeline.
// Usage: node kovea-sitemap-add.js <existing-json> [out-json]
import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
const BASE = 'https://www.kovea.co.kr';

// name-keyword → internal category. Order matters: accessories before their parent type.
const RULES = [
  ['tent_acc', /그라운드시트|풋프린트|이너텐트|이너 ?그라운드|스킨|루프/],
  ['pouch', /캐리백|캐리 백|수납|파우치|보관가방/],
  ['tarp', /타프|그늘막|쉐이드|쉐도우캐스터/],
  ['tent', /텐트|쉘터|돔(?!구장)|쉘\b|이너|플라이|쉘터/],
  ['sleeping_bag', /침낭|슬리핑|이너 ?시트|라이너/],
  ['mat', /매트|토퍼|에어 ?매트|매트리스/],
  ['chair', /체어|의자|스툴|벤치|릴렉서/],
  ['table', /테이블/],
  ['lighting', /랜턴|헤드랜턴|등불|라이트(?!.*테이블)/],
];
const catOf = (name) => {
  for (const [k, re] of RULES) if (re.test(name)) return k;
  return null;
};

const SIZE_KO = { XS: '엑스스몰', S: '스몰', M: '미디엄', L: '라지', XL: '엑스라지', XXL: '투엑스라지', '2XL': '투엑스라지', '3XL': '쓰리엑스라지' };
const COLOR_KW = ['다크그레이', '라이트그레이', '그레이지', '그레이', '차콜', '블랙', '화이트', '아이보리', '카키그린', '카키', '카모', '다크네이비', '네이비', '세이지', '올리브', '포레스트', '그린', '스카이블루', '블루', '레드', '오렌지', '옐로우', '머스타드', '다크브라운', '브라운', '코요테', '모카', '크림', '샌드', '탄', '베이지', '핑크', '퍼플', '라벤더', '버건디', '와인', '골드', '실버', '민트', '코랄'];
const findColor = (s) => COLOR_KW.find((c) => s === c || s.includes(c)) || '';
const extractVariant = (name) => {
  let color = '', base = name;
  const paren = name.match(/\(([^)]+)\)\s*$/);
  if (paren) { const c = findColor(paren[1].trim()); if (c) { color = paren[1].trim(); base = name.replace(/\s*\([^)]*\)\s*$/, '').trim(); } }
  if (!color) { const last = base.split(/\s+/).pop(); if (last && findColor(last) === last) { color = last; base = base.replace(/\s+\S+$/, '').trim(); } }
  const sm = base.match(/\s(XS|S|M|L|XL|XXL|2XL|3XL)$/i);
  return { color, size: sm ? sm[1].toUpperCase() : '' };
};

const fetchDetail = async (no) => {
  const html = await (await fetch(`${BASE}/product/x/${no}/`, { headers: { 'User-Agent': UA } })).text();
  const nm = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  const name = nm ? nm[1].replace(/\s*-\s*코베아\s*$/, '').replace(/\s+/g, ' ').trim() : '';
  const imgEl = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  let imageUrl = imgEl ? imgEl[1].split('?')[0] : '';
  if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
  const imgs = [];
  for (const m of html.matchAll(/koveaimage\.cafe24\.com\/[^"'\s)]+\.(?:jpg|jpeg|png)/gi)) imgs.push('https://' + m[0]);
  for (const m of html.matchAll(/(?:src|ec-data-src)=["']([^"']*?\/web\/upload\/[^"']+\.(?:jpg|jpeg|png))/gi)) {
    let u = m[1];
    if (/\/category\/|icon|menu|btn|common|custom_\d|sns_|logo/i.test(u)) continue;
    if (u.startsWith('//')) u = 'https:' + u; else if (u.startsWith('/')) u = BASE + u;
    imgs.push(u);
  }
  return { name, imageUrl, specImages: [...new Set(imgs)] };
};

const main = async () => {
  const path = process.argv[2];
  const out = process.argv[3] || path;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const have = new Set(data.map((x) => x._productNo || (x.groupId || '').replace('kovea_', '')));

  const xml = await (await fetch(`${BASE}/sitemap.xml`, { headers: { 'User-Agent': UA } })).text();
  const seen = new Map();
  for (const m of xml.matchAll(/\/product\/([^/<]+)\/(\d+)\//g)) {
    if (!seen.has(m[2])) seen.set(m[2], decodeURIComponent(m[1]).replace(/-/g, ' '));
  }
  const candidates = [...seen.entries()].filter(([no]) => !have.has(no));
  console.log(`[sitemap] ${seen.size} products, ${candidates.length} not yet crawled`);

  let added = 0, i = 0;
  for (const [no, slugName] of candidates) {
    i++;
    if (!catOf(slugName)) continue; // skip non-major types (slug pre-filter)
    let detail;
    try { detail = await fetchDetail(no); } catch { continue; }
    const nameKorean = detail.name || slugName;
    const category = catOf(nameKorean) || catOf(slugName);
    if (!category) continue;
    const { color, size } = extractVariant(nameKorean);
    data.push({
      groupId: `kovea_${no}`, category, company: 'kovea', companyKorean: '코베아',
      name: '', nameKorean, color: '', colorKorean: color,
      size, sizeKorean: size ? (SIZE_KO[size] || size) : '',
      weight: 0, imageUrl: detail.imageUrl, specs: {},
      _productNo: no, _detailUrl: `${BASE}/product/x/${no}/`,
      _specImages: detail.specImages, _source: 'sitemap', _discontinued: true,
    });
    added++;
    if (added % 20 === 0) console.log(`[sitemap]   added ${added}`);
  }
  writeFileSync(out, JSON.stringify(data, null, 2));
  console.log(`\n저장: ${out}  (신규 추가 ${added}, 총 ${data.length})`);
};

main();

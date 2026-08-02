// Retrofit name/size on an existing Kovea crawl JSON without re-crawling or re-OCR.
// Fixes: (1) English `name` wrongly filled with Korean → emptied;
//        (2) `nameKorean` from URL slug (drops '.', '~') → real og:title;
//        (3) trailing size token in name (e.g. "가죽 테이블보 M") → size/sizeKorean.
// Specs/weight/imageUrl already on the JSON are preserved.
// Usage: node kovea-fixnames.js <spec-json> [out-json]
import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const BASE = 'https://www.kovea.co.kr';
const SIZE_KO = { XS: '엑스스몰', S: '스몰', M: '미디엄', L: '라지', XL: '엑스라지', XXL: '투엑스라지', '2XL': '투엑스라지', '3XL': '쓰리엑스라지' };

const fetchName = async (no) => {
  try {
    const r = await fetch(`${BASE}/product/x/${no}/`, { headers: { 'User-Agent': UA } });
    const h = await r.text();
    const m = h.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
      || h.match(/content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
    return m ? m[1].replace(/\s*-\s*코베아\s*$/, '').replace(/\s+/g, ' ').trim() : '';
  } catch { return ''; }
};
// Korean colour keywords (Kovea bakes colour into the name, often in trailing "(...)").
const COLOR_KW = ['다크그레이', '라이트그레이', '그레이지', '그레이', '차콜', '블랙', '화이트', '아이보리',
  '카키그린', '카키', '카모', '다크네이비', '네이비', '세이지', '올리브', '포레스트', '그린',
  '스카이블루', '블루', '레드', '오렌지', '옐로우', '머스타드', '다크브라운', '브라운', '코요테',
  '모카', '크림', '샌드', '탄', '베이지', '핑크', '퍼플', '라벤더', '버건디', '와인', '골드', '실버', '민트', '코랄'];
const findColor = (s) => COLOR_KW.find((c) => s === c || s.includes(c)) || '';

// Returns {color, size}. Colour: trailing "(...)" or a trailing known colour word.
// Size: a trailing S/M/L/… token after the colour part is removed.
const extractVariant = (name) => {
  let color = '';
  let base = name;
  const paren = name.match(/\(([^)]+)\)\s*$/);
  if (paren) {
    const c = findColor(paren[1].trim());
    if (c) { color = paren[1].trim(); base = name.replace(/\s*\([^)]*\)\s*$/, '').trim(); }
  }
  if (!color) {
    const last = base.split(/\s+/).pop();
    if (last && findColor(last) === last) { color = last; base = base.replace(/\s+\S+$/, '').trim(); }
  }
  const sm = base.match(/\s(XS|S|M|L|XL|XXL|2XL|3XL)$/i);
  const size = sm ? sm[1].toUpperCase() : '';
  return { color, size };
};

const main = async () => {
  const path = process.argv[2];
  const out = process.argv[3] || path;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let fixed = 0, sized = 0, colored = 0;
  for (let i = 0; i < data.length; i++) {
    const it = data[i];
    const no = it._productNo || (it.groupId || '').replace('kovea_', '');
    const real = await fetchName(no);
    if (real) { it.nameKorean = real; fixed++; }
    it.name = ''; // English name not available for this Korean brand
    const { color, size } = extractVariant(it.nameKorean);
    it.size = size;
    it.sizeKorean = size ? (SIZE_KO[size] || size) : '';
    it.color = '';
    it.colorKorean = color;
    if (size) sized++;
    if (color) colored++;
    if ((i + 1) % 20 === 0 || i + 1 === data.length) console.log(`[fixnames] ${i + 1}/${data.length} (name ${fixed}, size ${sized}, color ${colored})`);
  }
  writeFileSync(out, JSON.stringify(data, null, 2));
  console.log(`\n저장: ${out}  (이름보정 ${fixed}, 사이즈 ${sized}, 색상 ${colored})`);
};

main();

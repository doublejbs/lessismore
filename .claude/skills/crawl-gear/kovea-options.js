// Expand Cafe24 option selects into individual variant rows.
// Some Kovea products are ONE product_no with an option dropdown (e.g. color 블루/옐로우);
// each option must become its own product row (same groupId, distinct color/size).
// Products without an option select are kept as a single row (their colour already came
// from the name bracket or the image 색상 field).
// Usage: node kovea-options.js <json> [out]
import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
const BASE = 'https://www.kovea.co.kr';

const COLOR_KW = ['다크그레이', '라이트그레이', '그레이지', '그레이', '차콜', '블랙', '화이트', '아이보리', '카키베이지', '카키그린', '카키', '카모', '다크네이비', '네이비', '세이지', '올리브', '포레스트', '모스그린', '모스', '그린', '스카이블루', '블루', '레드', '오렌지', '옐로우', '머스타드', '다크브라운', '브라운', '코요테', '모카', '코코아', '크림', '샌드', '탄', '바닐라', '베이지', '핑크', '퍼플', '라벤더', '버건디', '와인', '골드', '실버', '민트', '코랄', '플린트'];
const SIZE_KO = { XS: '엑스스몰', S: '스몰', M: '미디엄', L: '라지', XL: '엑스라지', XXL: '투엑스라지', '2XL': '투엑스라지', '3XL': '쓰리엑스라지' };
const isColor = (v) => COLOR_KW.some((c) => v === c || v.includes(c));
const sizeTok = (v) => { const m = v.match(/^(XS|S|M|L|XL|XXL|2XL|3XL)$/i); return m ? m[1].toUpperCase() : ''; };

const fetchOptions = async (no) => {
  const html = await (await fetch(`${BASE}/product/x/${no}/`, { headers: { 'User-Agent': UA } })).text();
  const selects = [...html.matchAll(/<select[^>]*class="[^"]*ProductOption\d[^"]*"[^>]*>([\s\S]*?)<\/select>/gi)];
  const dims = [];
  for (const s of selects) {
    const opts = [...s[1].matchAll(/<option[^>]*>([^<]*)<\/option>/g)]
      .map((m) => m[1].trim())
      .filter((t) => t && t !== '*' && !/^-+$/.test(t) && !/필수|선택해|옵션을|품절|sold ?out/i.test(t));
    if (opts.length) dims.push(opts);
  }
  return dims;
};

// classify a dimension by its values → 'color' | 'size' | 'other'
const dimKind = (vals) => {
  if (vals.every((v) => isColor(v))) return 'color';
  if (vals.every((v) => sizeTok(v))) return 'size';
  if (vals.filter((v) => isColor(v)).length >= Math.ceil(vals.length / 2)) return 'color';
  return 'other';
};

const main = async () => {
  const path = process.argv[2];
  const out = process.argv[3] || path;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const result = [];
  let expanded = 0, addedRows = 0, i = 0;
  for (const item of data) {
    i++;
    const no = item._productNo || (item.groupId || '').replace('kovea_', '');
    let dims = [];
    try { dims = await fetchOptions(no); } catch { dims = []; }
    // Only COLOR / SIZE dimensions define catalog variants. Drop 'other' dimensions
    // (pole length, model compatibility on A/S parts, etc.) — expanding those explodes
    // into thousands of meaningless rows.
    const kept = dims.map((vals) => ({ vals, kind: dimKind(vals) })).filter((d) => d.kind !== 'other');
    if (!kept.length) { result.push(item); continue; }

    let combos = [[]];
    for (const d of kept) combos = combos.flatMap((c) => d.vals.map((v) => [...c, { v, kind: d.kind }]));

    for (const combo of combos) {
      const row = JSON.parse(JSON.stringify(item));
      const suffixes = [];
      for (const { v, kind } of combo) {
        if (kind === 'color') { row.colorKorean = v; suffixes.push(v); }
        else if (kind === 'size') { const s = sizeTok(v); row.size = s; row.sizeKorean = SIZE_KO[s] || s; suffixes.push(v); }
      }
      if (suffixes.length) row.nameKorean = `${item.nameKorean} (${suffixes.join(' / ')})`;
      delete row._discontinued;
      result.push(row);
    }
    expanded++;
    addedRows += combos.length - 1;
    console.log(`[options] ${item.nameKorean.slice(0, 26)} → ${combos.length}변형 [${kept.map((d) => d.kind)}]`);
    if (i % 40 === 0) console.log(`  ...${i}/${data.length}`);
  }
  writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(`\n저장: ${out}  (옵션제품 ${expanded}개 → +${addedRows}행, 총 ${result.length})`);
};

main();

// 몽벨 신규 후처리: 카테고리 중복 행 제거(구체 카테고리 우선) · 방석(Trail Cushion) → mat · 색상 "-" 비움 · 예외 이름 한글화
import { readFileSync, writeFileSync } from 'node:fs';
const [src, dst] = process.argv.slice(2);
const rows = JSON.parse(readFileSync(src, 'utf-8'));
const RANK = { etc: 0, clothing: 1 };
const best = new Map();
for (const r of rows) {
  if (/Trail Cushion/i.test(r.name)) { r.category = 'mat'; r._source = r._detailUrl; } // 같은 _source 의 침낭과 카테고리 분리
  if (r.color === '-') r.color = r.colorKorean = '';
  // 배낭 액세서리(레인커버·사이드 포켓·추가 백)가 backpack 으로 들어옴 → 맞는 카테고리로
  if (r.category === 'backpack' && /Rain Cover/i.test(r.name)) { r.category = 'backpack_cover'; r._source = r._detailUrl; }
  if (r.category === 'backpack' && /Side Pocket|Extra Bag/i.test(r.name)) { r.category = 'pouch'; r._source = r._detailUrl; }
  if (/^12 SR-6 Frame1\/4set/.test(r.name)) r.nameKorean = r.nameKorean.replace(/^12 sr-6 frame1\/4set/i, '12 SR-6 프레임 1/4 세트');
  if (/Tenacious Tape|SR-6 Frame/i.test(r.name)) { r.category = 'tent_acc'; r.specs = {}; r._source = r._detailUrl; }
  if (['pouch', 'backpack_cover'].includes(r.category) && r.specs) delete r.specs.gender; // 배낭에서 옮긴 행의 스키마 밖 키
  const k = `${r.groupId}|${r.color}|${r.size}`;
  const prev = best.get(k);
  if (!prev || (RANK[prev.category] ?? 9) < (RANK[r.category] ?? 9)) best.set(k, r);
}
const out = rows.filter((r) => best.get(`${r.groupId}|${r.color}|${r.size}`) === r);
writeFileSync(dst, JSON.stringify(out, null, 2));
console.log(`${rows.length} → ${out.length}`);

// 핸드오프 카테고리 계약(cookware/headlamp 신설) 반영 후, 기존 크롤 JSON을 무게·이미지·
// 한글명·specs 보존한 채 재분류한다. 영향 전환은 §3 규칙상 상품명만으로 판정 가능하다:
//   · 헤드랜턴(§3-1): 헤드+램프/토치 또는 Nitecore NU/HC 모델 → headlamp
//   · 조리 본체(§3-3): 팟/쿡셋/쿠커/케틀/팬/스킬렛(캐니스터 제외) → cookware
// LIGHTING↔LIGHTING, CUPWARE↔CUPWARE로 스키마가 같아 specs는 그대로 둔다.
// 사용: node gossamer-gear-reclassify.js
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(__dirname, 'out', 'gossamer-gear-full.json');

const isHeadlamp = (n) => /head\s*(lamp|torch)|headlamp|headlight/i.test(n) || /nitecore.*\b(?:NU|HC)\s?\d/i.test(n);
const isCookware = (n) => !/canister/i.test(n) && /cook(?:set|er|ware)?|kettle|\bpot\b|\bpan\b|skillet|griddle/i.test(n);

const rows = JSON.parse(readFileSync(jsonPath, 'utf-8'));
const changes = {};
let changed = 0;
for (const r of rows) {
  let cat = r.category;
  // 헤드램프: 어느 카테고리에 있든 헤드랜턴이면 headlamp로 승격.
  if (isHeadlamp(r.name) && cat !== 'headlamp') cat = 'headlamp';
  // 조리 본체: 기존 cookware_etc 중 팟류만 cookware로.
  else if (cat === 'cookware_etc' && isCookware(r.name)) cat = 'cookware';
  if (cat !== r.category) {
    const key = `${r.name.replace(/ - .*/, '').replace(/ \/ .*/, '')}  [${r.category} → ${cat}]`;
    changes[key] = (changes[key] || 0) + 1;
    r.category = cat;
    changed++;
  }
}
writeFileSync(jsonPath, JSON.stringify(rows, null, 1), 'utf-8');
console.log(`재분류 완료: ${changed}행 변경`);
for (const [k, v] of Object.entries(changes)) console.log(`  (${v}행) ${k}`);

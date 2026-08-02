// 크롤 출력(JSON)을 SKILL.md "출력 검증 체크리스트" 전체에 대해 자동 검사한다.
// 사용법: node .claude/skills/crawl-gear/validate.js <크롤-json>
//
// ⚠ 언어 방향을 "양방향" 모두 검사한다(과거 실수: 영문필드에 한글만 보고, 한글필드에 영문은 안 봐서
//    nameKorean/colorKorean에 영문이 들어간 걸 통째로 놓침). name·size·color=영문, nameKorean·
//    sizeKorean·colorKorean=한글 — 어느 쪽이든 반대 언어가 섞이면 잡는다.
//
// 결과: ERROR(규칙 위반, 0이어야 함) / FLAG(사람 검토 필요 — 사이트가 원래 영문만 주는 등 정당한
//       예외일 수 있음) / INFO(커버리지) 3단계로 보고. ERROR가 하나라도 있으면 exit code 1.
import { readFileSync } from 'node:fs';
import { SPECS_SCHEMA, CATEGORY_KEYS } from './specs-schema.js';

const path = process.argv[2];
if (!path) {
  console.error('Usage: node validate.js <crawl-json>');
  process.exit(2);
}
const rows = JSON.parse(readFileSync(path, 'utf-8'));
const hasKorean = (s) => /[가-힣]/.test(s || '');
const hasLatin = (s) => /[A-Za-z]/.test(s || '');
const allowed = {};
for (const c of CATEGORY_KEYS) allowed[c] = new Set(Object.keys(SPECS_SCHEMA[c] || {}));

const REQUIRED = ['groupId', 'category', 'company', 'companyKorean', 'name', 'nameKorean', 'imageUrl', '_detailUrl'];
const idOf = (r) => r._godCd ?? r._productNo ?? r.groupId ?? '?';

const errors = {};
const flags = {};
const bump = (bag, key, r, detail) => {
  (bag[key] = bag[key] || { count: 0, ex: [] });
  bag[key].count++;
  if (bag[key].ex.length < 6) bag[key].ex.push(idOf(r) + (detail != null ? ` [${detail}]` : ''));
};
const err = (k, r, d) => bump(errors, k, r, d);
const flag = (k, r, d) => bump(flags, k, r, d);

const dk = new Map();
for (const r of rows) {
  // 필수 필드 비어있지 않음 + null 금지
  for (const f of REQUIRED) if (r[f] === '' || r[f] == null) err(`필수 필드 빈값: ${f}`, r);
  for (const [f, v] of Object.entries(r)) if (v === null) err(`null 값(빈문자열 써야 함): ${f}`, r);

  // 언어 방향 — 영문 필드에 한글
  if (hasKorean(r.name)) err('name(영문)에 한글 누출', r, r.name);
  if (hasKorean(r.color)) err('color(영문)에 한글 누출', r, r.color);
  if (hasKorean(r.size)) err('size(영문)에 한글 누출', r, r.size);
  // 언어 방향 — 한글 필드에 영문만(한글 없음). 사이트가 원래 영문만 주면 정당 → FLAG.
  if (r.nameKorean && !hasKorean(r.nameKorean)) flag('nameKorean에 한글 없음(영문뿐)', r, r.nameKorean);
  if (r.colorKorean && !hasKorean(r.colorKorean)) flag('colorKorean에 한글 없음(영문뿐)', r, r.colorKorean);
  if (r.sizeKorean && !hasKorean(r.sizeKorean) && hasLatin(r.sizeKorean) && !/^[0-9A-Za-z/.\s-]+$/.test(r.sizeKorean))
    flag('sizeKorean에 한글 없음', r, r.sizeKorean);

  // 색상/사이즈 페어 — 한쪽만 채워지면 안 됨
  if ((r.color && !r.colorKorean) || (!r.color && r.colorKorean)) err('color/colorKorean 페어 불일치', r, `${r.color}|${r.colorKorean}`);
  if ((r.size && !r.sizeKorean) || (!r.size && r.sizeKorean)) err('size/sizeKorean 페어 불일치', r, `${r.size}|${r.sizeKorean}`);

  // groupId 형식 <brand>_<slug>
  if (!/^[a-z0-9-]+_.+/i.test(r.groupId || '')) err('groupId 형식 오류(<brand>_<slug> 아님)', r, r.groupId);

  // imageUrl HTTPS 절대 URL
  if (r.imageUrl && !/^https:\/\//.test(r.imageUrl)) err('imageUrl 비HTTPS', r, r.imageUrl);

  // _detailUrl(개별 상세 URL) 존재
  if (!r._detailUrl) err('_detailUrl 빈값(개별 상세 URL 필요)', r);

  // HTML 엔티티 잔존
  if (/&[a-z]+;|&#\d+;/i.test(`${r.name || ''}${r.nameKorean || ''}${r.color || ''}${r.colorKorean || ''}`))
    err('HTML 엔티티 잔존', r);

  // 카테고리 유효성
  if (!CATEGORY_KEYS.includes(r.category)) err('잘못된 카테고리 키', r, r.category);

  // spec 키가 스키마와 일치(오타 없음)
  const al = allowed[r.category] || new Set();
  for (const k of Object.keys(r.specs || {})) if (!al.has(k)) err(`스펙 키 오타/스키마 불일치: ${r.category}.${k}`, r);

  // weight 숫자
  if (typeof r.weight !== 'number' || Number.isNaN(r.weight) || r.weight < 0) err('weight 숫자 아님/음수', r, String(r.weight));

  // 중복 (groupId, color, size)
  const key = `${r.groupId}|${r.color || ''}|${r.size || ''}`;
  if (!dk.has(key)) dk.set(key, []);
  dk.get(key).push(r);
}
for (const [key, arr] of dk) for (let i = 1; i < arr.length; i++) err('중복 행 (groupId,color,size)', arr[i], key);

// 커버리지(INFO)
const byProd = new Map();
for (const r of rows) {
  if (!byProd.has(idOf(r))) byProd.set(idOf(r), { w: false, img: false, korName: false });
  const p = byProd.get(idOf(r));
  if (r.weight > 0) p.w = true;
  if (r.imageUrl) p.img = true;
  if (hasKorean(r.nameKorean)) p.korName = true;
}
const nProd = byProd.size;
const wRate = [...byProd.values()].filter((p) => p.w).length;
const imgRate = [...byProd.values()].filter((p) => p.img).length;
const korRate = [...byProd.values()].filter((p) => p.korName).length;

// ── 리포트 ──
const line = '─'.repeat(64);
console.log(line);
console.log(`검증: ${path}`);
console.log(`행 ${rows.length} · 상품 ${nProd}`);
console.log(line);
const printBag = (label, bag) => {
  const keys = Object.keys(bag);
  if (!keys.length) {
    console.log(`${label}: 없음 ✓`);
    return 0;
  }
  const total = keys.reduce((s, k) => s + bag[k].count, 0);
  console.log(`${label}: ${keys.length}종 / ${total}건`);
  for (const k of keys.sort((a, b) => bag[b].count - bag[a].count)) {
    console.log(`  • ${k} — ${bag[k].count}건`);
    console.log(`      예: ${bag[k].ex.join(', ')}`);
  }
  return total;
};
const nErr = printBag('❌ ERROR (규칙 위반, 0이어야 함)', errors);
console.log(line);
printBag('⚠️  FLAG (검토 필요 — 사이트가 원래 영문만 주는 등 정당한 예외일 수 있음)', flags);
console.log(line);
console.log('ℹ️  커버리지 (상품 단위):');
console.log(`   무게      ${wRate}/${nProd} (${((wRate / nProd) * 100).toFixed(0)}%)`);
console.log(`   imageUrl  ${imgRate}/${nProd} (${((imgRate / nProd) * 100).toFixed(0)}%)`);
console.log(`   nameKorean 한글 ${korRate}/${nProd} (${((korRate / nProd) * 100).toFixed(0)}%)`);
if (imgRate === 0) console.log('   ⚠️ imageUrl 전부 빈값 — 이미지 셀렉터 확인 필요');
console.log(line);
console.log(nErr === 0 ? '✅ ERROR 0건 — 규칙 통과' : `❌ ERROR ${nErr}건 — 수정 필요`);
process.exit(nErr === 0 ? 0 : 1);

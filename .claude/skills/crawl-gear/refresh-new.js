// 리프레시용 신규 추출: 재크롤 JSON을 Firestore gear 와 대조해 "DB에 없는 행"만 따로 저장한다(SKILL "신규 판별은 Firestore 가 기준선").
// 기존 행으로 보는 조건(하나라도 맞으면 기존):
//   1) 같은 상세 URL(productUrl) + 같은 color + 같은 size   — 어댑터가 이름·groupId를 바꿨어도 같은 상품으로 잡기 위한 1순위
//   2) groupId + color + size                                 — push.js upsert 1순위 키
//   3) 같은 회사의 (nameKorean 또는 legacy name) + colorKorean/color + size (공백·대소문자 무시) — 사용자 직접 입력분과의 중복 방지
//   4) 같은 상세 URL + color 이고 DB size 가 빈값, 새 행 size 가 "<용량>L" — 배낭 용량-사이즈 룰(2026-10) 이전 push분
// Firestore 는 Node 20 으로(firebase-admin SlowBuffer 이슈).
//
// Usage: /opt/homebrew/opt/node@20/bin/node refresh-new.js <crawl-json> [out-json]
//   out 기본값: <crawl-json>에서 .json → -new.json
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [src, dstArg] = process.argv.slice(2);
if (!src) {
  console.error('Usage: node refresh-new.js <crawl-json> [out-json]');
  process.exit(1);
}
const dst = dstArg || src.replace(/\.json$/, '-new.json');
const data = JSON.parse(readFileSync(src, 'utf-8'));
const rows = Array.isArray(data) ? data : data.items || data.gears;

initializeApp({ credential: cert(JSON.parse(readFileSync(join(here, 'serviceAccountKey.json'), 'utf-8'))) });
const db = getFirestore();

const norm = (s) => String(s ?? '').replace(/\s+/g, '').toLowerCase();
// 상세 URL 키 — 같은 상품이 다른 주소로 잡히지 않게 정규화(2026-11 미스테리월·코베아에서 카테고리 경로·슬러그 차이로 가짜 신규)
//   Cafe24: "/product/<슬러그>/<번호>/category/46/display/1/" · "/product/detail.html?product_no=<번호>" → "<호스트>#<번호>"
//   메이크샵: "shopdetail.html?branduid=<번호>" → "<호스트>#<번호>"
const urlKey = (u) => {
  const s = decodeURIComponent(String(u || '')).replace(/^https?:\/\/(www\.|m\.)?/, '').toLowerCase();
  const host = s.split('/')[0];
  const no = s.match(/[?&](?:product_no|branduid|gear_srl)=(\d+)/)?.[1] || s.match(/\/product\/[^/]+\/(\d+)(?:\/|$)/)?.[1];
  return no ? `${host}#${no}` : s.replace(/\/+$/, '');
};

// 비교 대상: 이 JSON 에 나오는 회사들 + 같은 호스트 productUrl 문서
const companies = [...new Set(rows.map((r) => r.company).filter(Boolean))];
const docs = new Map();
for (let i = 0; i < companies.length; i += 10) {
  const snap = await db.collection('gear').where('company', 'in', companies.slice(i, i + 10)).get();
  for (const d of snap.docs) docs.set(d.id, d.data());
}
const hosts = [...new Set(rows.map((r) => (r._detailUrl || r._source || '').match(/^https?:\/\/[^/]+/)?.[0]).filter(Boolean))];
for (const h of hosts) {
  for (const base of [h, h.replace('://www.', '://'), h.replace('://', '://www.')]) {
    const snap = await db.collection('gear').where('productUrl', '>=', base).where('productUrl', '<', `${base}~`).get();
    for (const d of snap.docs) docs.set(d.id, d.data());
  }
}
const existing = [...docs.values()];
const byUrl = new Set(existing.map((g) => `${urlKey(g.productUrl)}|${norm(g.color)}|${norm(g.size)}`));
const byGroup = new Set(existing.filter((g) => g.groupId).map((g) => `${g.groupId}|${norm(g.color)}|${norm(g.size)}`));
// 이름 비교는 끝의 사이즈를 뗀 기본 이름으로(정규화 단계가 사이즈를 이름 끝에 붙여 옛 행과 문자열이 달라지는 문제, 2026-11 케일)
const stripSize = (n, ...sizes) => {
  let t = String(n || '').replace(/\s*\/\s*[^/]+$/, (m) => (sizes.some((z) => z && m.includes(z)) ? '' : m));
  for (const z of sizes) if (z && t.endsWith(` ${z}`)) t = t.slice(0, -z.length - 1);
  return t;
};
const byName = new Set();
for (const g of existing) {
  for (const n of [g.nameKorean, g.name]) {
    for (const c of [g.colorKorean, g.color]) {
      byName.add(`${norm(g.company)}|${norm(n)}|${norm(c)}|${norm(g.sizeKorean || g.size)}`);
      byName.add(`${norm(g.company)}|${norm(stripSize(n, g.size, g.sizeKorean))}|${norm(c)}|${norm(g.sizeKorean || g.size)}`);
    }
  }
}

// 4) 같은 URL+색상인데 DB 쪽 size 가 빈값이고 새 행 size 가 "<용량>L"(배낭 용량-사이즈 룰 도입 전 push분)
const byUrlNoSize = new Set(existing.filter((g) => !g.size).map((g) => `${urlKey(g.productUrl)}|${norm(g.color)}`));
const isPackSizeOnly = (r) => r.size && r.specs?.volume && norm(r.size) === norm(`${r.specs.volume}L`) && byUrlNoSize.has(`${urlKey(r._detailUrl || r._source)}|${norm(r.color)}`);
const nameHit = (r) =>
  [r.nameKorean, r.name, stripSize(r.nameKorean, r.size, r.sizeKorean), stripSize(r.name, r.size, r.sizeKorean)].some((n) =>
    [r.colorKorean, r.color].some((c) => [r.sizeKorean, r.size].some((z) => byName.has(`${norm(r.company)}|${norm(n)}|${norm(c)}|${norm(z)}`))),
  );
const isExisting = (r) =>
  isPackSizeOnly(r) ||
  nameHit(r) ||
  byUrl.has(`${urlKey(r._detailUrl || r._source)}|${norm(r.color)}|${norm(r.size)}`) ||
  byGroup.has(`${r.groupId}|${norm(r.color)}|${norm(r.size)}`) ||
  [r.colorKorean, r.color].some((c) => byName.has(`${norm(r.company)}|${norm(r.nameKorean)}|${norm(c)}|${norm(r.sizeKorean || r.size)}`)) ||
  [r.colorKorean, r.color].some((c) => byName.has(`${norm(r.company)}|${norm(r.nameKorean)}|${norm(c)}|${norm(r.size)}`));

const fresh = rows.filter((r) => !isExisting(r));
writeFileSync(dst, JSON.stringify(Array.isArray(data) ? fresh : { ...data, items: fresh }, null, 2));
const byCompany = {};
for (const r of fresh) byCompany[r.company] = (byCompany[r.company] || 0) + 1;
console.log(`[refresh-new] ${src}`);
console.log(`  크롤 ${rows.length}행 · 비교 대상 DB ${existing.length}행 · 신규 ${fresh.length}행 (상품 ${new Set(fresh.map((r) => r._detailUrl || r._source)).size}개)`);
console.log(`  회사별 신규: ${JSON.stringify(byCompany)}`);
console.log(`  → ${dst}`);

// 더스턴기어 크롤(영문)에 한글명/색상/사이즈를 채운다. SKILL.md "한글화" 룰:
//  - 2026-11 개정(크롤 공통 룰): **제품명에 브랜드명 금지**(회사는 company 필드에만) → 접두 "더스턴기어" 제거.
//    **모델명까지 한글 음역**(X-Mid→엑스미드, Kakwa→카콰). 영문은 소재·규격 약어(DCF/DAC/ALUULA/NFL/YKK/RS)만 유지.
//  - 사이즈가 있으면 한글명 끝에 sizeKorean 부착(예외 없음).
//  - 2026-08 push분은 옛 규칙("더스턴기어 X-Mid 1")이라 표기가 다르다 — 리프레시 신규 판별은 상세 URL 기준이라 영향 없음.
// 사용: node durston-gear-kr-apply.js [crawl-json]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const crawlPath = process.argv[2] || join(__dirname, 'out', 'durston-gear-full.json');

// ── 단어 사전(일반어 + 색상/사이즈). 모델 코드는 KEEP로 원문 유지. ──
const WORD = {
  durston: '', // 브랜드명은 company 필드에만 → 이름에서 제거
  'x-mid': '엑스미드', 'x-dome': '엑스돔', 'z-flick': '지플릭', kakwa: '카콰', wapta: '왑타', iceline: '아이스라인',
  ultra: '울트라', ultragrid: '울트라그리드', stakes: '스테이크', stake: '스테이크', bag: '백', gen: '젠',
  groundsheet: '그라운드시트', groundsheets: '그라운드시트', spare: '스페어', parts: '파츠',
  pro: '프로', solid: '솔리드', tent: '텐트', pole: '폴', poles: '폴', trekking: '트레킹',
  stargazer: '스타게이저', kit: '킷', repair: '리페어', sticker: '스티커', logo: '로고',
  reflective: '리플렉티브', ironwire: '아이언와이어', '3-pack': '3팩',
  // 색상/사이즈(이름에 포함될 수 있음)
  black: '블랙', red: '레드', small: '스몰', medium: '미디엄', large: '라지', regular: '레귤러',
};
const COLOR = { black: '블랙', red: '레드' };
const SIZE = { small: '스몰', medium: '미디엄', large: '라지', regular: '레귤러', short: '쇼트', long: '롱', s: '스몰', m: '미디엄', l: '라지', all: '전체' };

// 그대로 두는 토큰: 모델 코드/소재코드/규격(숫자·+·인치 등).
const KEEP = /^(?:DCF|DAC|ALUULA|Easton|YKK|NFL|RS)$/i;
const isKeep = (t) => KEEP.test(t) || /^[0-9]/.test(t) || /^[0-9.]+\+?$/.test(t) || /^[SMLX/]+$/.test(t);

const translitToken = (t) => {
  const bare = t.replace(/[().,]/g, '');
  if (!bare) return t;
  const w = WORD[bare.toLowerCase()]; // WORD 우선(3-Pack 등 숫자 시작 일반어 먼저)
  if (w !== undefined) return w;
  if (isKeep(bare)) return bare;
  return t; // 미상 → 원문(모델명 보존)
};
const transliterateName = (name) =>
  name
    .split(' / ')[0] // " / 사이즈" 꼬리는 sizeKorean으로 따로 붙인다
    .split(/\s+/)
    .map(translitToken)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

const colorToKorean = (c) => {
  const key = (c || '').trim().toLowerCase();
  if (!key) return '';
  return COLOR[key] || key.split(/\s+/).map((w) => COLOR[w] ?? w).join(' ');
};
const sizeToKorean = (s) => {
  const v = (s || '').trim();
  if (!v) return '';
  return v
    .split(/(\s+|[-/])/)
    .map((seg) => (/^\s+$/.test(seg) || /[-/]/.test(seg) ? seg : SIZE[seg.toLowerCase()] ?? seg))
    .join('');
};

const rows = JSON.parse(readFileSync(crawlPath, 'utf-8'));
let n = 0;
for (const r of rows) {
  if (r.color) r.colorKorean = colorToKorean(r.color);
  if (r.size) r.sizeKorean = sizeToKorean(r.size);
  // 영문 name 끝에도 " / size"(SKILL 룰). 어댑터가 이미 붙였으면 그대로
  if (r.size && !r.name.endsWith(` / ${r.size}`)) r.name = `${r.name} / ${r.size}`;
  r.nameKorean = r.size ? `${transliterateName(r.name)} ${r.sizeKorean}` : transliterateName(r.name);
  n++;
}
writeFileSync(crawlPath, JSON.stringify(rows, null, 1), 'utf-8');
console.log(`한글화 적용: ${n}행 -> ${crawlPath}`);

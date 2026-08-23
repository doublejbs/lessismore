// 더스턴기어 크롤(영문)에 한글명/색상/사이즈를 채운다. SKILL.md "한글화" 룰:
//  - 모델 코드(X-Mid/X-Dome/Z-Flick/Kakwa/Wapta/Iceline/DCF/DAC/ALUULA 등)는 한국에서도 영문
//    표기가 통용되므로 그대로 둔다. 일반 명사·색상·사이즈는 음역하고 브랜드 접두 "더스턴기어"를 붙인다.
//  - 브랜드명 자체(Durston)는 접두가 대신하므로 이름 속에선 제거(중복 방지).
// 사용: node durston-gear-kr-apply.js [crawl-json]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const crawlPath = process.argv[2] || join(__dirname, 'out', 'durston-gear-full.json');

// ── 단어 사전(일반어 + 색상/사이즈). 모델 코드는 KEEP로 원문 유지. ──
const WORD = {
  durston: '', // 브랜드명은 접두가 대신 → 제거
  groundsheet: '그라운드시트', groundsheets: '그라운드시트', spare: '스페어', parts: '파츠',
  pro: '프로', solid: '솔리드', tent: '텐트', pole: '폴', poles: '폴', trekking: '트레킹',
  stargazer: '스타게이저', kit: '킷', repair: '리페어', sticker: '스티커', logo: '로고',
  reflective: '리플렉티브', ironwire: '아이언와이어', '3-pack': '3팩',
  // 색상/사이즈(이름에 포함될 수 있음)
  black: '블랙', red: '레드', small: '스몰', medium: '미디엄', large: '라지', regular: '레귤러',
};
const COLOR = { black: '블랙', red: '레드' };
const SIZE = { small: '스몰', medium: '미디엄', large: '라지', regular: '레귤러', s: '스몰', m: '미디엄', l: '라지', all: '전체' };

// 그대로 두는 토큰: 모델 코드/소재코드/규격(숫자·+·인치 등).
const KEEP = /^(?:X-Mid|X-Dome|Z-Flick|Kakwa|Wapta|Iceline|DCF|DAC|ALUULA|Ultra|UltraGrid|Easton|YKK|NFL)$/i;
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
  ('더스턴기어 ' + name.split(/\s+/).map(translitToken).join(' '))
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
  r.nameKorean = transliterateName(r.name);
  if (r.color) r.colorKorean = colorToKorean(r.color);
  if (r.size) r.sizeKorean = sizeToKorean(r.size);
  n++;
}
writeFileSync(crawlPath, JSON.stringify(rows, null, 1), 'utf-8');
console.log(`한글화 적용: ${n}행 -> ${crawlPath}`);

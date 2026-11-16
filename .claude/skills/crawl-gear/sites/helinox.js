// 헬리녹스 한국 공식몰(helinox.co.kr) — 메이크샵(MakeShop), EUC-KR(CP949) 인코딩. 단일 브랜드지만 콜라보 상품이 절반 이상.
//
// ⚠ 리스팅: 카테고리 페이지 HTML은 빈 껍데기 — 상품은 XHR
//    /shop/product_list.action.html?action_mode=get_list&page=N&xcode=…&type=X|P|Y 가 JSON({list:[{uid,brandcode,name}]})으로 준다.
//    name은 CP949 URL 인코딩. "Shop All"(051)에 일부 상품이 빠져 있어 상위 카테고리 전부를 합집합으로 모은다(1,336개, 2026-10).
//    brandcode 앞 3자리 = xcode(카테고리), 다음 3자리 = mcode.
// ⚠ 상세: /shop/shopdetail.html?branduid=<uid> 서버렌더(CP949). 초당 요청이 많으면 IP 차단 페이지(1KB 미만)를 준다
//    → 순차 요청 + 1.2초 간격, 차단 시 20초씩 늘려 재시도. 받은 페이지는 out/helinox-cache/ 에 캐시(재크롤 시 재사용).
//    제품명 h2.prd-name, 색상 p.prd-subname(색상마다 상품 페이지가 따로 있음), 이미지 //helinox.img13.kr/MS_product/<uid>/…
//    자체 옵션은 `var optionJsonData = {basic:…}` (대부분 단일 SKU, 일부 사이즈/색상 옵션).
//    「스펙」 표: 구분 | (체결|결합|사용|제품) 시 | 패킹 시 … 무게 행. 콜라보 구형 페이지는 "무게 / 950 g / 케이스 포함 무게 / 1.140 g"
//    처럼 마침표가 천 단위 구분(1.140 g = 1140g).
// ⚠ 이름: 정규 상품은 한글명만, 콜라보는 영문명(일부 한글) → helinox-dict.js 사전으로 양방향 변환, 사전에 없는 한글은 로마자 음역.
//    콜라보 파트너는 이름에서 떼어 끝에 "(BAPE Collab)" / "(베이프 콜라보)"로 붙인다(뉴미디엄 콜라보 표기와 동일). company는 전부 Helinox.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORDS, EN_ONLY, EN_WORDS, PARTNERS, COLORS } from './helinox-dict.js';

const BASE = 'https://www.helinox.co.kr';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const CACHE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'out', 'helinox-cache');
// 상위 카테고리(합집합). type: X=카테고리, P=기획 목록, Y=컬렉션
const LIST_CATS = [
  ['051', 'P'], ['034', 'X'], ['035', 'X'], ['036', 'X'], ['037', 'X'], ['039', 'X'], ['062', 'X'], ['040', 'X'],
  ['017', 'X'], ['038', 'X'], ['042', 'X'], ['041', 'X'], ['016', 'X'], ['046', 'X'], ['058', 'X'], ['050', 'Y'],
  ['043', 'P'], ['053', 'P'], ['054', 'P'], ['055', 'P'],
];
// 상품이 아닌 페이지(캘린더 신청·체험단 이벤트)
const NOT_PRODUCT = /캘린더 신청|인사이더즈|미니멀 캠핑 #/;

// ── 공통 유틸 ──
const sleep = (ms) => execFileSync('sleep', [String(ms / 1000)]);
const curlBuf = (url, headers = []) =>
  execFileSync('curl', ['-s', '--compressed', '-A', UA, ...headers.flatMap((h) => ['-H', h]), url], { maxBuffer: 64 * 1024 * 1024 });
const cp949 = (buf) => new TextDecoder('euc-kr').decode(buf);
const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™')
    .replace(/&bull;/g, '•')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const norm = (s) => decode(s || '').replace(/[\s ]+/g, ' ').replace(/[’‘]/g, "'").trim();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ── 로마자 음역(사전에 없는 한글 → name/color 영문 필드용) ──
const RR_I = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const RR_M = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
const RR_F = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];
const romanizeWord = (w) => {
  let out = '';
  for (const ch of w) {
    const c = ch.codePointAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) {
      const b = c - 0xac00;
      out += RR_I[Math.floor(b / 588)] + RR_M[Math.floor((b % 588) / 28)] + RR_F[b % 28];
    } else out += ch;
  }
  return out.replace(/^([^a-zA-Z]*)([a-z])/, (_, p, c) => p + c.toUpperCase());
};
const romanize = (s) => s.replace(/[가-힣]+/g, romanizeWord);

// ── 사전 치환(긴 구절 우선, 자리표시자로 이중 치환 방지) ──
const buildReplacer = (pairs, { korean }) => {
  const sorted = [...pairs].sort((a, b) => b[0].length - a[0].length);
  const rules = sorted.map(([from, to]) => ({
    re: korean
      ? new RegExp(`(?<![가-힣])${esc(from)}(?![가-힣])`, 'g')
      : new RegExp(`(?<![A-Za-z0-9])${esc(from)}(?![A-Za-z0-9])`, 'gi'),
    to,
  }));
  return (text) => {
    const slots = [];
    let s = text;
    for (const { re, to } of rules) {
      s = s.replace(re, () => {
        slots.push(to);
        return `\u0001${slots.length - 1}\u0002`;
      });
    }
    return s.replace(/\u0001(\d+)\u0002/g, (_, i) => slots[Number(i)]);
  };
};
const ko2enWords = buildReplacer(WORDS, { korean: true });
const en2koWords = buildReplacer(
  [
    ...EN_WORDS,
    ...EN_ONLY,
    // WORDS 역방향(같은 영문이면 먼저 나온 한글)
    ...WORDS.filter(([, en], i) => WORDS.findIndex(([, e]) => e === en) === i).map(([ko, en]) => [en, ko]),
  ],
  { korean: false },
);
const ko2enColor = buildReplacer(COLORS, { korean: true });
const en2koColor = buildReplacer(
  COLORS.filter(([, en], i) => COLORS.findIndex(([, e]) => e.toLowerCase() === en.toLowerCase()) === i).map(([ko, en]) => [en, ko]),
  { korean: false },
);
const tidy = (s) =>
  s
    .replace(/\(\s*\)/g, '')
    .replace(/\s+([,)])/g, '$1')
    .replace(/([(])\s+/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s/,&|-]+|[\s/,&|-]+$/g, '')
    .trim();
const dedupParen = (s) => s.replace(/(\S+) \((\S+)\)/g, (m, a, b) => (a.toLowerCase() === b.toLowerCase() ? a : m));
const EN_NORM = [[/\bTac\.?(?=\s)/g, 'Tactical'], [/\bConv\./g, 'Convertible'], [/\bStorge\b/g, 'Storage'], [/\bT-shirts?\b/g, 'T-Shirt']];
const enNorm = (s) => EN_NORM.reduce((acc, [re, to]) => acc.replace(re, to), s);
const toEn = (s) => dedupParen(enNorm(tidy(romanize(ko2enWords(s)))));
const toKo = (s) => tidy(en2koWords(s));
const COLOR_EN_LOWER = new Set(COLORS.map(([, en]) => en.toLowerCase()));
const colorEn = (s) =>
  tidy(romanize(ko2enColor(s)))
    .replace(/\b([A-Z]{3,})\b/g, (w) => (COLOR_EN_LOWER.has(w.toLowerCase()) ? w[0] + w.slice(1).toLowerCase() : w))
    .replace(/\b([a-z])/g, (c) => c.toUpperCase());
const colorKo = (s) => (/[가-힣]/.test(s) && !/[A-Za-z]{2,}/.test(s) ? tidy(s) : tidy(en2koColor(s)));

// ── 원본 이름 → 판매 메모 제거, 파트너·에디션·색상 분리 ──
const NOTE_PAREN = /\((?:[^()]*(?:Only|Raffle|구매\s*페이지|구매페이지|선착순|발매|단종|P\.M\.|\d{1,2}\s*AM|별매|주문제작|신청)[^()]*|\d{1,2}\.\d{1,2}[^()]*)\)/gi;
const cleanRaw = (raw) =>
  norm(raw)
    .replace(/[™®]/g, '')
    .replace(/^\d{2}(?:SS|FW)\s+/i, '') // 시즌 접두 19SS·21FW
    .replace(/\[(?:HCC[^\]]*|Only HCC|주문제작)\]\s*/gi, '')
    .replace(NOTE_PAREN, '')
    .replace(/\((?:HCC[^)]*)\)/gi, '')
    .replace(/\s*\/\s*\(?HCC(?: Seoul| Busan| Jeju)? Only\)?/gi, '')
    .replace(/\s*\/\s*HCC Only/gi, '')
    .replace(/\(\s*단종\s*\)|단종/g, '')
    .replace(/\*?10th Ann(?:iversary|\.)\*?/gi, '10th Anniversary')
    .replace(/\s{2,}/g, ' ')
    .trim();

const COLOR_KO_SET = new Set(COLORS.map(([ko]) => ko));
const COLOR_EN_SET = new Set(COLORS.map(([, en]) => en.toLowerCase()));
const COLOR_KO_NOSPACE = new Set(COLORS.map(([ko]) => ko.replace(/\s+/g, '')));
const isColorWord = (w) => COLOR_KO_SET.has(w) || COLOR_EN_SET.has(w.toLowerCase()) || COLOR_KO_NOSPACE.has(w.replace(/\s+/g, ''));
const parseName = (raw, subname) => {
  let s = cleanRaw(raw);
  let version = '';
  const ver = s.match(/^\[(\d{4}) Ver\.\]\s*|^\[Renewal\]\s*/i);
  if (ver) {
    version = ver[1] ? `${ver[1]} Ver.` : 'Renewal';
    s = s.slice(ver[0].length);
  }
  // 파트너 추출(여러 개 가능: Neighborhood X Claymore, Hydro Flask Campcore)
  const partners = [];
  for (const [en, ko, re] of PARTNERS) {
    const m = s.match(re);
    if (m) {
      partners.push({ en, ko, at: m.index });
      s = s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length);
    }
  }
  partners.sort((a, b) => a.at - b.at);
  // 헬리녹스 자신과 협업 구분자 제거
  s = s
    .replace(/[Xx×](?=헬리녹스|Helinox)/g, ' ')
    .replace(/(?<=헬리녹스|Helinox)[Xx×](?=[가-힣A-Z])/g, ' ')
    .replace(/\s*&\s*(?:Helinox|헬리녹스)(?![A-Za-z가-힣])/gi, ' ')
    .replace(/(?<![A-Za-z가-힣])(?:Helinox|헬리녹스)(?![A-Za-z가-힣])/gi, ' ')
    .replace(/(?:^|\s)(?:X|x|×|\||ㅣ|by)(?=\s|$)/g, ' ')
    .replace(/^\s*&\s*/, '')
    .replace(/\bCollaboration\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/^[/|,&-]\s*|\s*[/|,&-]$/g, '')
    .trim();
  // " / 꼬리" → 색상(콜라보 컬러웨이) 또는 용량. 정규 상품의 구조적 슬래시(트레킹 폴 / Passport / …, 시트 워머 / 체어원)는 건드리지 않는다
  let color = '';
  let sizeHint = '';
  // 괄호 밖(깊이 0)의 마지막 '/'만 구분자로 본다 — "(2ea/set)" 같은 괄호 속 슬래시는 무시
  let depth = 0;
  let cut = -1;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(' || s[i] === '[') depth++;
    else if (s[i] === ')' || s[i] === ']') depth--;
    else if (s[i] === '/' && depth === 0) cut = i;
  }
  const slash = cut > 0 ? [s, s.slice(0, cut), s.slice(cut + 1)] : null;
  // 구조적 슬래시: 트레킹 폴 / 라인 / 모델, 시트 워머 / 호환 체어 — 색상이 아니다(한글엔 \b가 안 먹어 lookahead로)
  const structural = /^(?:트레킹 폴|시트 워머|플리스 시트 워머|플리스 코트 워머|FL)(?=\s|\/|$)/.test(s);
  if (structural) {
    s = /워머/.test(s) ? s.replace(/\s*\/\s*(.+)$/, ' ($1)') : s.replace(/\s*\/\s*/g, ' ');
  }
  if (slash && !structural) {
    const tail = slash[2].trim();
    if (/^\d+(?:\.\d+)?\s*m?l$/i.test(tail)) sizeHint = tail;
    else color = tail.replace(/\s*\(\s*\)$/, '');
    s = slash[1].trim();
  }
  // "[RED]", "[Kaki]" 대괄호 꼬리 / "(브라운)", "(샐리)" 같은 색·캐릭터 괄호 꼬리
  const br = s.match(/\s*\[([^\]]+)\]$/);
  if (br && !color) {
    color = br[1];
    s = s.slice(0, br.index).trim();
  }
  // 콜라보 이름 끝에 붙은 색상("토트백 블랙", "체어원홈 하딩블랙", "에코백 (샐리)", "우산 - 레드")
  if (!color && partners.length) {
    const paren = s.match(/^(.+?)\s*\(([^()]+)\)$/) || s.match(/^(.+?)\s+-\s+([^-]+)$/);
    if (paren && isColorWord(paren[2].trim())) {
      color = paren[2].trim();
      s = paren[1].trim();
    } else {
      // 꼬리 1단어 → 2단어 순으로(짧은 것 먼저: "6 패널 캡 블랙", "체어 미니 샐리")
      const toks = s.split(' ');
      for (const k of [1, 2]) {
        if (toks.length <= k) break;
        const cand = toks.slice(-k).join(' ');
        if (isColorWord(cand)) {
          color = cand;
          s = toks.slice(0, -k).join(' ');
          break;
        }
      }
    }
  }
  // 반전 컬러 "Happy Suit - Black" + 꼬리 "Light Grey" → "Black / Light Grey"
  const dash = s.match(/^(.+?)\s-\s(\S+)$/);
  if (dash && color && isColorWord(dash[2])) {
    color = `${dash[2]} / ${color}`;
    s = dash[1];
  }
  color = color.replace(/^\d+\.\s*/, '').replace(/\s*\((?:서울|부산|제주)[^)]*\)/g, '').trim();
  if (subname && !color) color = norm(subname);
  color = color.replace(/\s*\([^()]*\)\s*/g, ' ').trim();
  if (/^\d+(?:\.\d+)?\s*[*x×]\s*\d+(?:\.\d+)?\s*cm$/i.test(color)) {
    sizeHint = color.replace(/\s+/g, ''); // 색상 자리에 들어간 치수(쿠션 50*70cm) → 사이즈
    color = '';
  }
  return { base: s, partners, color, sizeHint, version };
};

const buildNames = (raw, subname) => {
  const { base, partners, color, sizeHint, version } = parseName(raw, subname);
  const hasKo = /[가-힣]/.test(base);
  let en = hasKo ? toEn(base) : dedupParen(enNorm(tidy(base)));
  let ko = hasKo ? tidy(base) : toKo(base);
  if (version) {
    en = `${en} (${version})`;
    ko = `${ko} (${version === 'Renewal' ? '리뉴얼' : version.replace('Ver.', '버전')})`;
  }
  if (partners.length) {
    en = `${en} (${partners.map((p) => p.en).join(' x ')} Collab)`;
    ko = `${ko} (${partners.map((p) => p.ko).join(' x ')} 콜라보)`;
  }
  // 한글명 안의 영문 단어도 사전으로(정규 상품 "LT", "#2" 등 코드는 그대로 남음)
  ko = dedupParen(tidy(en2koWords(ko)));
  const cEn = color ? colorEn(color) : '';
  const cKo = color ? colorKo(color) : '';
  return { name: en, nameKorean: ko, color: cEn, colorKorean: cKo, sizeHint, partners: partners.map((p) => p.en) };
};

// ── 상세 HTML 파싱 ──
const textLines = (html) =>
  decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '\n'))
    .split('\n')
    .map((l) => l.replace(/[\s ]+/g, ' ').trim())
    .filter(Boolean);

// "1.02kg" → 1020, "780g" → 780, "4,700 g" → 4700, "1.140 g"(마침표 천 단위) → 1140
const toGram = (v) => {
  const m = String(v).match(/(\d[\d,]*(?:\.\d+)?)\s*(kg|g)\b/i);
  if (!m) return 0;
  let num = m[1];
  if (m[2].toLowerCase() === 'g' && /^\d{1,2}\.\d{3}$/.test(num)) num = num.replace('.', '');
  const n = parseFloat(num.replace(/,/g, ''));
  return m[2].toLowerCase() === 'kg' ? Math.round(n * 1000 * 100) / 100 : n;
};
const ROW_LABEL = /^(너비|길이|높이|좌면|무게|중량|최대|용량|수용|최장|최단|섹션|소재|사이즈|케이스|원산지|\*|배송안내|구성|체어 사이즈|패킹|폴 소재)/;

const parseSpec = (lines) => {
  const i0 = lines.indexOf('스펙');
  const L = i0 >= 0 ? lines.slice(i0 + 1, i0 + 80) : lines;
  const end = L.findIndex((l) => l === '배송안내');
  const T = end >= 0 ? L.slice(0, end) : L;
  // 열 머리: '구분' 다음 ~ 첫 행 라벨 전
  let cols = [];
  const g = T.indexOf('구분');
  if (g >= 0) {
    for (let k = g + 1; k < T.length && !ROW_LABEL.test(T[k]) && cols.length < 6; k++) cols.push(T[k]);
    // "체결 시 (이너 텐트)"처럼 상태 열 바로 뒤의 괄호는 보조 표기 — 열이 아님. 락킹풋 "(re)"처럼 단독 열은 유지
    cols = cols.filter((c, i) => !(/^\(.*\)$/.test(c) && i > 0 && /시$/.test(cols[i - 1])));
  }
  const rowVals = (label) => {
    const k = T.findIndex((l) => label.test(l));
    if (k < 0) return null;
    const vals = [];
    for (let j = k + 1; j < T.length && !ROW_LABEL.test(T[j]); j++) vals.push(T[j]);
    return { label: T[k], vals };
  };
  return { T, cols, rowVals };
};

// 무게 행의 열별 값(사이즈별 매핑용)
const weightCells = ({ cols, rowVals }) => {
  const row = rowVals(/^무게\s*\(세트\)$/) || rowVals(/^(무게|중량)(\(g\))?$/);
  if (!row || cols.length < 2) return null;
  const cells = row.vals.map((v) => (v === '-' ? 0 : toGram(v)));
  return cells.length === cols.length ? Object.fromEntries(cols.map((c, i) => [c, cells[i]])) : null;
};
const weightFrom = ({ T, cols, rowVals }, lines) => {
  // 콜라보 구형: "무게 / 950 g / 케이스 포함 무게 / 1.140 g" → 케이스 포함(패킹) 우선
  const withCase = rowVals(/^케이스 포함 무게/);
  if (withCase && withCase.vals.length) {
    // "케이스 포함 무게 (체어/락킹풋) 1.2 kg / 0.47kg" 세트 → 합산
    const parts = withCase.vals.join(' ').split(/\s*\/\s*/).map(toGram).filter(Boolean);
    const w = parts.length > 1 ? Math.round(parts.reduce((x, y) => x + y, 0) * 100) / 100 : parts[0] || 0;
    if (w) return w;
  }
  // "무게(세트)"(상판+프레임) > "무게" > "무게(상판)" 순
  const row = rowVals(/^무게\s*\(세트\)$/) || rowVals(/^(무게|중량)(\(g\))?$/) || rowVals(/^(무게|중량)\s*\(/);
  if (!row) {
    // 스펙 표 밖 문장 "패킹 시 무게는 1.12kg" 류
    const m = lines.join(' ').match(/(?:패킹 시 무게는|무게\s*[:：])\s*([\d.,]+\s*(?:kg|g))/i);
    return m ? toGram(m[1]) : 0;
  }
  const vals = row.vals.join(' ') === '' ? [] : row.vals.map((v) => (/^g$/i.test(v) ? null : v)).filter((v) => v !== null);
  // "1.360" + "g" 처럼 단위가 다음 줄로 갈라진 경우 합치기
  const joined = row.vals.join(' ').replace(/(\d)\s+(kg|g)\b/gi, '$1$2');
  if (vals.length === 1 || cols.length === 0) {
    const one = joined;
    // "1.26 kg / 1.42 kg (케이스 포함)" / "2.81kg (패킹 시: 2.85kg)" → 케이스·패킹 값
    const pk = one.match(/([\d.,]+\s*(?:kg|g))\s*\((?:케이스 포함|패킹 시)\)/i) || one.match(/(?:패킹 시|케이스 포함)\s*[:：]?\s*([\d.,]+\s*(?:kg|g))/i);
    if (pk) return toGram(pk[1]);
    return toGram(one);
  }
  // 열 구조: '패킹 시' 열 우선, 없으면 첫 값
  const cells = vals.map((v) => {
    const pk = v.match(/패킹 시\s*[:：]\s*([\d.,]+\s*(?:kg|g))/i);
    return pk ? toGram(pk[1]) : v === '-' ? 0 : toGram(v);
  });
  const isState = cols.every((c) => /시$|^제품$|^-$/.test(c));
  const isSet = lines.some((l) => /세트 상품|^구성\s*:/.test(l));
  if (!isState && isSet && cols.length > 1 && cells.filter(Boolean).length > 1) {
    // 세트 구성(이너텐트 2P | 풋프린트 2P) → 합산
    return Math.round(cells.reduce((x, y) => x + y, 0) * 100) / 100;
  }
  const pi = cols.findIndex((c) => /패킹/.test(c));
  if (pi >= 0 && cells[pi]) return cells[pi];
  return cells.find(Boolean) || 0;
};

const parseDetail = (html) => {
  const lines = textLines(html);
  const name = norm((html.match(/class="prd-name">([\s\S]*?)<\/h2>/) || [])[1] || '');
  const subname = norm((html.match(/class="prd-subname">([\s\S]*?)<\/p>/) || [])[1] || '');
  const crumbs = [...(html.match(/<nav class="page_location">([\s\S]*?)<\/nav>/) || ['', ''])[1].matchAll(/<a[^>]*>([^<]*)<\/a>/g)].map((m) => norm(m[1]));
  // 이미지: 슬라이더(MS_product) → 신규 CDN(cdn1.kr …/K-cdn-sub/MS_product) → 대표 이미지(/shopimages/helinox/<brandcode>[3].jpg)
  const imgs = [...html.matchAll(/src="(\/\/helinox\.img13\.kr\/MS_product\/[^"]+)"/g)].map((m) => `https:${m[1].trim()}`);
  const cdn = [...html.matchAll(/src="(https:\/\/www\.cdn1\.kr\/dom\/helinox\.img13\.kr\/K-cdn-sub\/MS_product\/[^"]+)"/g)].map((m) => m[1].trim().replace(/ /g, '%20'));
  const shopImg = (html.match(/src="(\/shopimages\/helinox\/\d{12,13}\.(?:jpg|png|gif))/) || [])[1];
  // 자체 옵션
  const opts = [];
  const oj = html.match(/var optionJsonData = (\{[\s\S]*?\});\s*\n/);
  if (oj) {
    const seen = new Set();
    for (const m of oj[1].matchAll(/opt_name:'([^']*)',opt_matrix:'[^']*',opt_value:'([^']*)'/g)) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      opts.push({ name: m[1], values: decode(m[2]).split(',').map((v) => v.trim()).filter(Boolean) });
    }
  }
  const spec = parseSpec(lines);
  return { lines, name, subname, crumbs, img: imgs[0] || cdn[0] || (shopImg ? `${BASE}${shopImg}` : ''), opts, spec, weight: weightFrom(spec, lines), weightByCol: weightCells(spec) };
};

// ── 카테고리(영문명 키워드, 순서 중요) ──
const classify = (en, xcode) => {
  const s = en.toLowerCase();
  if (/seat warmer|cot warmer|cup holder|headrest|chair anchor|field cover|advanced skin|rocking foot|ball feet|rubber feet|ground strap|ground sheet|personal shade|summer kit|home foot|dog cot cover/.test(s)) return 'furniture_etc';
  if (/side storage|storage pocket|table bridge|solid top case|field office top|frame set|button section|inner shell|cot leg/.test(s)) return 'furniture_etc';
  if (/footprint|inner tent|\broof\b|\bfly\b|tarp pole|stake|\bstring\b|stopper|daisy chain|organizer|tarp field strap|molle clip|quick connector|velcro tie|multi link/.test(s)) return 'tent_acc';
  if (/trekking pole case|snow basket/.test(s)) return 'etc';
  if (/trekking pole|ridgeline|passport tl|causeway/.test(s)) return 'trekking_pole';
  if (/royal box|sunshade/.test(s)) return 'shelter';
  if (/\btarp\b|recta|e-tarp|n-tarp/.test(s)) return 'tarp';
  if (/dome|tunnel|tent|h-shack|shelter|e-base|n-solo|keron/.test(s)) return 'tent';
  if (/\bcot\b|lite cot|high cot|e-cot|dog cot/.test(s)) return 'furniture_etc';
  if (/chair|bench|stool|rocker/.test(s)) return 'chair';
  if (/table/.test(s)) return 'table';
  if (/field office|e-hangar/.test(s)) return 'pouch';
  if (/glove/.test(s)) return 'gloves';
  if (/t-shirt|\btee\b|hoodie|sweat|jacket|pants|shorts?\b|skirt|vest|beanie|\bcap\b|cap \d|ball cap|hat\b|bandana|muffler|robe|happy suit|boots|crewneck|polo|long sleeve|windbreak|shirt/.test(s)) return 'clothing';
  if (/backpack|knapsack|back pack/.test(s) && !/cooler|strap/.test(s)) return 'backpack';
  if (/bottle|thor 1l|thor 350/.test(s)) return 'bottle';
  if (/mug|\bcup\b|sierra|soju/.test(s)) return 'cup';
  if (/plate/.test(s)) return 'bowl';
  if (/tongs|flatware|utensil|chopstick/.test(s)) return 'cutlery';
  if (/grill/.test(s)) return 'cookware';
  if (/iso gas|butane|gas cover|pot mat/.test(s)) return 'cookware_etc';
  if (/torch/.test(s)) return 'torch';
  if (/lantern|capon light|athena light|\bair \(|medal \(/.test(s)) return 'lighting';
  if (/towel/.test(s) && !/crewneck|polo|jogger/.test(s)) return 'towel';
  if (/duffel|duffle|bag|sack|pouch|sacoche|tote|case|hip pack|carrier|cube|sling|wallet|thor/.test(s)) return 'pouch';
  if (xcode === '038') return 'trekking_pole';
  return 'etc';
};

const num = (v) => (v ? String(parseFloat(String(v).replace(/,/g, ''))) : '');
const buildSpecs = (cat, d, nameEn) => {
  const { rowVals, cols } = d.spec;
  const out = {};
  const pi = cols.findIndex((c) => /패킹/.test(c));
  const cell = (row) => (row ? (pi >= 0 && row.vals[pi] ? row.vals[pi] : row.vals[0]) : '');
  const all = d.lines.join('\n');
  const material = () => {
    const m = all.match(/·\s*(?:스킨\/케이스 소재|스킨 소재|소재|원단)\s*\n\s*:\s*([^\n]+)/);
    return m ? m[1].trim() : '';
  };
  if (cat === 'chair' || cat === 'table') {
    const ml = rowVals(/^최대 허용 중량/);
    const mx = ml && (ml.vals.find((v) => /\d/.test(v)) || '').match(/([\d.]+)\s*kg/i);
    if (mx) out.maxLoad = num(mx[1]);
    if (pi >= 0) {
      const w = rowVals(/^너비/), l = rowVals(/^길이/), h = rowVals(/^높이/);
      const dims = [w, l, h].map((r) => (r && r.vals[pi] && r.vals[pi] !== '-' ? r.vals[pi].replace(/\s*cm$/, '') : ''));
      if (dims.every(Boolean)) out.packedSize = `${dims.join(' x ')} cm`;
    }
    const fm = all.match(/·\s*프레임 소재\s*\n\s*:\s*([^\n]+)/);
    if (fm) out.frameMaterial = fm[1].trim();
    const mat = material();
    if (mat && cat === 'chair') out.material = mat;
    const tm = all.match(/·\s*(?:상판|테이블 ?탑|탑) 소재\s*\n\s*:\s*([^\n]+)/);
    if (tm && cat === 'table') out.topMaterial = tm[1].trim();
  } else if (cat === 'tent' || cat === 'tarp' || cat === 'shelter') {
    const cap = rowVals(/^수용/);
    const c = cap && (cap.vals.find((v) => /\d/.test(v)) || '').match(/(\d+)\s*인/);
    if (c) out.capacity = c[1];
    else {
      const p = nameEn.match(/(\d+(?:\.\d+)?)\s*P\b/i);
      if (p && cat === 'tent') out.capacity = String(Math.floor(parseFloat(p[1])));
    }
  } else if (cat === 'backpack' || cat === 'pouch') {
    const v = rowVals(/^용량/);
    const vv = (v && v.vals[0]) || '';
    const m = vv.match(/([\d.]+)\s*L/i) || nameEn.match(/(\d+(?:\.\d+)?)\s*L\b/);
    if (m) out[cat === 'backpack' ? 'volume' : 'capacity'] = num(m[1]);
    const mat = material();
    if (mat) out.material = mat;
  } else if (cat === 'bottle' || cat === 'cup') {
    const ml = nameEn.match(/(\d+)\s*ml/i);
    const oz = nameEn.match(/(\d+)\s*oz/i);
    if (ml) out.capacity = ml[1];
    else if (oz) out.capacity = String(Math.round(parseFloat(oz[1]) * 29.5735));
  } else if (cat === 'trekking_pole') {
    const mx = rowVals(/^최장/), mn = rowVals(/^최단/);
    const g = (r) => ((r && r.vals.find((x) => /\d/.test(x))) || '').match(/([\d.]+)\s*cm/);
    if (g(mx)) out.maxLength = num(g(mx)[1]);
    if (g(mn)) out.minLength = num(g(mn)[1]);
  }
  return out;
};

// 옵션이 이름 괄호에 나열된 경우("집게 (12cm/18cm/24cm)", "락킹풋 ((re)/One/Two/XL)") 끝 괄호를 통째로 제거(중첩 괄호 대응)
const stripListParen = (s) => {
  const t = s.trimEnd();
  if (!t.endsWith(')')) return s;
  let depth = 0;
  for (let i = t.length - 1; i >= 0; i--) {
    if (t[i] === ')') depth++;
    else if (t[i] === '(' && --depth === 0) {
      const inner = t.slice(i + 1, -1);
      return /[/,]|\d-\d|[A-Z]-[A-Z]/.test(inner) ? t.slice(0, i).trim() : s;
    }
  }
  return s;
};
const SIZE_KO = { XS: '엑스스몰', S: '스몰', M: '미디엄', L: '라지', XL: '엑스라지', XXL: '투엑스라지', '2XL': '투엑스라지', ONE: '원', TWO: '투', ZERO: '제로', SUNSET: '선셋', SWIVEL: '스위블', 'ONE (RE)': '원 (re)' };
const sizeKo = (v) => (SIZE_KO[v.toUpperCase()] ? SIZE_KO[v.toUpperCase()] : /[가-힣]/.test(v) ? tidy(en2koWords(v)) : toKo(v));
const sizeEn = (v) => (/[가-힣]/.test(v) ? toEn(v) : v);
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/['’"®™]/g, '')
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');

// ── 리스팅(합집합) ──
const fetchListing = () => {
  const all = new Map();
  for (const [x, t] of LIST_CATS) {
    for (let p = 1; p < 40; p++) {
      const url = `${BASE}/shop/product_list.action.html?action_mode=get_list&page=${p}&xcode=${x}&mcode=&scode=&type=${t}&sort=manual&soldout_sort=Y&viewtype=list&is_list_buy=0`;
      let j = null;
      try {
        j = JSON.parse(curlBuf(url, ['X-Requested-With: XMLHttpRequest']).toString('utf-8'));
      } catch (e) {
        j = null;
      }
      const list = (j && j.list) || [];
      for (const r of list) {
        if (all.has(r.uid)) continue;
        let name = r.name;
        try {
          name = new TextDecoder('euc-kr').decode(Uint8Array.from(unescape(r.name.replace(/\+/g, ' ')), (c) => c.charCodeAt(0)));
        } catch (e) {
          /* 그대로 */
        }
        all.set(r.uid, { uid: r.uid, brandcode: r.brandcode, name: norm(name) });
      }
      if (!j || j.is_page_end || !list.length) break;
      sleep(300);
    }
  }
  return [...all.values()];
};

// 상세 페이지(캐시 우선). 차단 페이지(<20KB)는 20초씩 늘려 재시도, 성인인증 페이지는 null
const fetchDetailHtml = (uid) => {
  mkdirSync(CACHE_DIR, { recursive: true });
  const f = join(CACHE_DIR, `${uid}.html`);
  if (existsSync(f)) return readFileSync(f, 'utf-8');
  if (existsSync(`${f}.adult`)) return null;
  for (let t = 1; t <= 4; t++) {
    const html = cp949(curlBuf(`${BASE}/shop/shopdetail.html?branduid=${uid}`));
    if (html.length > 20000) {
      writeFileSync(f, html);
      sleep(1200);
      return html;
    }
    if (html.includes('성인인증')) {
      writeFileSync(`${f}.adult`, '');
      return null;
    }
    sleep(20000 * t);
  }
  return null;
};

// 사이즈 옵션 코드("(re) 1set" → "(re)", "Two 1set" → "Two")와 같은 스펙 열의 무게
const colWeight = (byCol, size) => {
  const code = size.replace(/\s*\d+\s*set$/i, '').trim().toLowerCase();
  const hit = Object.keys(byCol).find((c) => c.toLowerCase() === code);
  return hit ? byCol[hit] : 0;
};
const buildRows = (item, html) => {
  const d = parseDetail(html);
  const raw = d.name || item.name;
  const n = buildNames(raw, d.subname);
  const xcode = item.brandcode.slice(0, 3);
  let category = classify(n.name, xcode);
  let groupId = `helinox_${slug(n.name)}`;
  // 구매 절차용 옵션(교환 동의·각인·추가 구매)은 변형이 아니다
  const opts = d.opts.filter((o) => !/동의|각인|경보기/.test(o.name));
  const valueIsColor = (o) => o.values.every((v) => isColorWord(v.replace(/\s*\([^)]*\)/g, '').split(/\s*[&/]\s*/)[0].trim()));
  const colorOpt = opts.find(valueIsColor) || opts.find((o) => /색상|color|컬러/i.test(o.name));
  const sizeOpt = opts.find((o) => o !== colorOpt);
  const colors = colorOpt ? colorOpt.values : [null];
  const sizes = sizeOpt ? sizeOpt.values : [n.sizeHint || null];
  const baseSpecs = buildSpecs(category, d, n.name);
  if (colorOpt && n.color && !colorOpt.values.some((v) => colorKo(v) === n.colorKorean)) {
    n.name = `${n.name} (${n.color})`;
    n.nameKorean = `${n.nameKorean} (${n.colorKorean})`;
    groupId = `helinox_${slug(n.name)}`;
  }
  const rows = [];
  const baseWords = new Set(n.name.toLowerCase().split(/\s+/));
  const optLabel = (v) => {
    let x = v.split(/\s+-\s+/)[0].trim(); // 호환 목록 "XL - 체어원 엑스라지 / …" → 코드만
    // "12.6 / 2개 1세트 / 체어원 미니 / …", "One 1set / 체어원(구형/신형)" → 호환 체어 목록은 버린다
    const segs = x.split(/\s*\/\s*/);
    if (segs.length > 1) x = segs.filter((g, i) => i === 0 || /^\d+개 1세트$/.test(g)).join(' / ');
    x = x.replace(/(\d+)개 1세트/, '$1ea/set');
    const en = sizeEn(x);
    const kept = en.split(/\s+/).filter((w) => !baseWords.has(w.toLowerCase()));
    return kept.length ? { en: kept.join(' '), ko: x } : { en, ko: x };
  };
  for (const c of colors) {
    for (const z0 of sizes) {
      const z = z0 ? optLabel(z0) : null;
      const color = c ? colorEn(c) : n.color;
      const colorKorean = c ? colorKo(c) : n.colorKorean;
      let size = z ? z.en : '';
      let sizeKorean = z ? sizeKo(/[가-힣]/.test(z.ko) ? z.ko.replace(/(\d+)개 1세트/, '$1ea/set') : z.en) : '';
      const specs = { ...baseSpecs };
      if (!size && (category === 'backpack' || category === 'vest_pack') && specs.volume) {
        size = `${specs.volume}L`;
        sizeKorean = size;
      }
      // 옵션이 이름 괄호에 나열된 경우("집게 (12cm/18cm/24cm)", "(S,M,L)") 괄호 제거
      const strip = (s) => (sizeOpt ? stripListParen(s) : s);
      rows.push({
        groupId: sizeOpt ? `helinox_${slug(stripListParen(n.name))}` : groupId,
        category,
        company: 'Helinox',
        companyKorean: '헬리녹스',
        name: size ? `${strip(n.name)} / ${size}` : n.name,
        nameKorean: sizeKorean ? `${strip(n.nameKorean)} ${sizeKorean}` : n.nameKorean,
        color,
        colorKorean,
        size,
        sizeKorean,
        weight: (z && d.weightByCol && colWeight(d.weightByCol, z.en)) || d.weight,
        imageUrl: d.img,
        specs,
        _detailUrl: `${BASE}/shop/shopdetail.html?branduid=${item.uid}`,
        _source: `helinox_${category}`,
        _siteName: raw,
        _brandcode: item.brandcode,
      });
    }
  }
  return rows;
};

export { cleanRaw, parseName, buildNames, toEn, toKo, colorEn, colorKo, romanize, parseDetail, classify, buildRows, toGram, NOT_PRODUCT };

export default {
  name: 'helinox',
  company: 'Helinox',
  companyKorean: '헬리녹스',
  baseUrl: BASE,
  defaultCategories: ['all'],
  crawl: async () => {
    const items = fetchListing().filter((it) => !NOT_PRODUCT.test(it.name));
    console.log(`[helinox] 리스팅 ${items.length}개(카테고리 합집합, 비상품 제외)`);
    const rows = [];
    let adult = 0;
    items.forEach((it, i) => {
      const html = fetchDetailHtml(it.uid);
      if (!html) {
        // 성인인증 상품(녹스프로 가스 캔 5종) — 상세를 못 보므로 리스팅 이름·대표 이미지로만 행을 만든다(무게·스펙 없음)
        adult++;
        console.log(`[helinox]   ⚠ 상세 없음(성인인증) → 리스팅만: ${it.name}`);
        const n = buildNames(it.name, '');
        const category = classify(n.name, it.brandcode.slice(0, 3));
        rows.push({
          groupId: `helinox_${slug(n.name)}`,
          category,
          company: 'Helinox',
          companyKorean: '헬리녹스',
          name: n.name,
          nameKorean: n.nameKorean,
          color: n.color,
          colorKorean: n.colorKorean,
          size: '',
          sizeKorean: '',
          weight: 0,
          imageUrl: `${BASE}/shopimages/helinox/${it.brandcode}3.jpg`,
          specs: {},
          _detailUrl: `${BASE}/shop/shopdetail.html?branduid=${it.uid}`,
          _source: `helinox_${category}`,
          _siteName: it.name,
          _brandcode: it.brandcode,
        });
        return;
      }
      rows.push(...buildRows(it, html));
      if ((i + 1) % 100 === 0) console.log(`[helinox]   detail ${i + 1}/${items.length}`);
    });
    // 같은 상품이 여러 번 등록된 경우(이름 끝 공백, HCC 전용 재등록 등) — (groupId, color, size) 기준 1행.
    // 무게·이미지가 있는 행을 우선 남긴다.
    const score = (r) => (r.weight ? 2 : 0) + (r.imageUrl ? 1 : 0);
    const best = new Map();
    for (const r of rows) {
      const k = `${r.groupId}|${r.color}|${r.size}`;
      if (!best.has(k) || score(r) > score(best.get(k))) best.set(k, r);
    }
    const out = [...best.values()];
    console.log(`[helinox] 완료 ${items.length - adult}개 상품 / ${out.length}행 (중복 ${rows.length - out.length}행 제거, 상세 없음 ${adult})`);
    return out;
  },
};

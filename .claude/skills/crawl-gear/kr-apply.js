// Fill nameKorean + sizeKorean on the S2S crawl output (variant-level matching).
//
// Rule (per user):
//  - A KR product is the SAME product only if model + temperature + size + color all match.
//  - Matched variant → KR official name verbatim; if it lacks the size, append sizeKorean.
//  - No exact variant match → transliterated base (KO_BASE) + sizeKorean.
//
// Temperature: US sleeping bags expose specs.limitTemp (℃); KR names embed "N도".
// Color: our crawl rarely captures color, so it acts as a wildcard (we prefer
//        KR entries without a baked-in color to avoid picking an arbitrary one).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'out');

// ── clean line-level Korean (transliteration) for the generation fallback ──
const KO_BASE = {
  // sleeping_bag
  'alpine-down-sleeping-bag': '알파인 다운 침낭',
  'the-ascent-down-sleeping-bag': '아센트 다운 침낭',
  'ascent-womens-down-sleeping-bag': '아센트 여성용 다운 침낭',
  'basecamp-down-sleeping-bag': '베이스캠프 다운 침낭',
  'boab-synthetic-sleeping-bag': '보아브 신세틱 침낭',
  'the-ember-down-quilt': '엠버 다운 퀼트',
  'hamelin-synthetic-sleeping-bag': '하멜린 신세틱 침낭',
  'hamelin-womens-synthetic-sleeping-bag': '하멜린 여성용 신세틱 침낭',
  'spark-down-sleeping-bag': '스파크 다운 침낭',
  'spark-pro-down-sleeping-bag': '스파크 프로 다운 침낭',
  'spark-womens-down-sleeping-bag': '스파크 여성용 다운 침낭',
  'tanami-down-comforter': '타나미 다운 컴포터',
  'the-traveller-down-sleeping-bag': '트래블러 다운 침낭',
  'trek-down-sleeping-bag': '트렉 다운 침낭',
  'trek-womens-down-sleeping-bag': '트렉 여성용 다운 침낭',
  // mat
  'air-chair': '에어 체어',
  'air-seat': '에어 시트',
  'air-seat-insulated': '에어 시트 인슐레이티드',
  'air-sprung-cell-mat-repair-kit': '에어 매트리스 리페어 키트',
  'air-stream-dry-sack-pump': '에어스트림 펌프 색',
  'camp-plus-self-inflating-sleeping-pad': '캠프 플러스 자충 매트리스',
  'camp-self-inflating-pad': '캠프 자충 매트리스',
  'camp-self-inflating-pad-past-season': '캠프 자충 매트리스',
  'comfort-deluxe-self-inflating-sleeping-pad': '컴포트 디럭스 자충 매트리스',
  'comfort-light-insulated-pad': '컴포트 라이트 인슐레이티드 에어 매트리스',
  'comfort-light-insulated-womens-sleeping-pad': '컴포트 라이트 인슐레이티드 여성용 에어 매트리스',
  'comfort-plus-insulated-pad': '컴포트 플러스 인슐레이티드 에어 매트리스',
  'delta-self-inflating-seat': '델타 자충 시트',
  'ether-light-xr-insulated-air-sleeping-pad': '에테르 라이트 XR 인슐레이티드 에어 매트리스',
  'ether-light-xr-pro-insulated-air-sleeping-pad': '에테르 라이트 XR 프로 인슐레이티드 에어 매트리스',
  'mat-coupler-kit-loops': '매트 커플러 키트 루프',
  'pursuit-plus-self-inflating-sleeping-pad': '퍼수트 플러스 자충에어 매트리스',
  'pursuit-self-inflating-sleeping-pad': '퍼수트 자충에어 매트리스',
  'ultralight-sleeping-pad': '울트라라이트 에어 매트리스',
  'ultralight-insulated-mat': '울트라라이트 인슐레이티드 에어 매트리스',
  'ultralight-insulated-womens-sleeping-pad': '울트라라이트 인슐레이티드 여성용 에어 매트리스',
  'ultralight-xr-insulated-air-sleeping-pad': '울트라라이트 XR 인슐레이티드 에어 매트리스',
  // pillow
  'aeros-down-pillow': '에어로 필로우 다운 베개',
  'aeros-pillow-premium': '에어로 필로우 프리미엄 베개',
  'aeros-pillow-premium-past-season': '에어로 필로우 프리미엄 베개',
  'aeros-premium-traveller-pillow': '에어로 필로우 프리미엄 트래블러 베개',
  'aeros-pillow-ultra-light': '에어로 필로우 울트라라이트 베개',
  'aeros-pillow-ultra-light-past-season': '에어로 필로우 울트라라이트 베개',
  'aeros-traveller-pillow': '에어로 필로우 울트라라이트 트래블러 베개',
  'foam-core-pillow': '폼 코어 베개',
  'memory-lux-pillow': '메모리 럭스 베개',
  // tent
  'ikos-evo-tent': '아이코스 에보 텐트',
  'telos-evo-bikepack-tent': '텔러스 에보 바이크팩 텐트',
  'telos-evo-tent': '텔러스 에보 텐트',
  // tarp
  'escapist-evo-tarp': '이스캐피스트 에보 타프',
  'escapist-mesh-bug-shelter': '이스캐피스트 메쉬 버그 쉘터',
  'minimalist-tarp': '미니멀리스트 타프',
  'ultra-sil-nano-tarp-poncho': '울트라실 나노 타프 판초',
  // tent_acc
  'alto-bigfoot-footprint': '알토 빅 풋프린트',
  'alto-gear-loft': '알토 기어 로프트',
  'alto-lightfoot-footprint': '알토 라이트 풋프린트',
  'ground-control-guy-cords': '그라운드 컨트롤 가이 코드',
  'light-tent-pegs': '그라운드 컨트롤 라이트 텐트 펙',
  'ground-control-tent-pegs': '그라운드 컨트롤 텐트 펙',
  'telos-hangout-pole-set-grey': '텔러스 행아웃 폴 세트',
  'ikos-footprint': '아이코스 풋프린트',
  'telos-bigfoot-footprint': '텔러스 빅 풋프린트',
  'telos-gear-loft': '텔러스 기어 로프트',
  'telos-lightfoot-footprint': '텔러스 라이트 풋프린트',
  'utensil-peg-bag': '울트라실 펙 & 유텐실 백',
  // cookware_etc
  'detour-essential-kitchen-kit': '디투어 에센셜 캠프 키친 키트',
  'detour-collapsible-kettle': '디투어 접이식 케틀',
  'detour-collapsible-pot': '디투어 접이식 팟',
  'detour-collapsible-pouring-pot': '디투어 접이식 푸어링 팟',
  'detour-stainless-steel-kettle-cookset': '디투어 케틀 쿡 세트',
  'detour-5-piece-cookset': '디투어 원 팟 쿡 세트',
  'detour-stainless-steel-pan': '디투어 팬',
  'frontier-collapsible-pouring-pot': '프론티어 접이식 푸어링 팟',
  'frontier-ultralight-3-piece-cookset': '프론티어 원 팟 쿡 세트',
  'frontier-collapsible-kettle': '프론티어 접이식 케틀',
  'frontier-collapsible-kettle-cookset': '프론티어 케틀 쿡 세트',
  'frontier-collapsible-3-piece-kettle-cookset': '프론티어 케틀 쿡 세트',
  'frontier-collapsible-5-piece-cookset': '프론티어 원 팟 쿡 세트',
  'frontier-ultralight-collapsible-one-pot-cook-set': '프론티어 원 팟 쿡 세트',
  'frontier-ultralight-collapsible-pot': '프론티어 접이식 팟',
  'frontier-ultralight-pour-over': '프론티어 접이식 드리퍼',
  'frontier-ultralight-one-pot-cookset': '프론티어 원 팟 쿡 세트',
  'frontier-ultralight-5-piece-cookset': '프론티어 원 팟 쿡 세트',
  'frontier-ultralight-pan': '프론티어 팬',
  'frontier-ultralight-pot': '프론티어 팟',
  'frontier-ultralight-14-piece-cookset': '프론티어 투 팟 쿡 세트',
  'frontier-ultralight-6-piece-cookset': '프론티어 투 팟 쿡 세트',
  'frontier-ultralight-two-pot-cookset': '프론티어 투 팟 세트',
  // cup
  'detour-collapsible-mug': '디투어 접이식 머그',
  'frontier-collapsible-cup': '프론티어 접이식 컵',
  'frontier-ultralight-collapsible-kettle-cook-set-with-cups-used': '프론티어 케틀 쿡 세트',
  'passage-cup': '패시지 컵',
  'passage-insulated-mug': '패시지 인슐레이티드 머그',
  // bowl
  'detour-stainless-steel-bowl': '디투어 접이식 보울',
  'detour-collapsible-6-piece-dinnerware': '디투어 접이식 디너웨어 세트',
  'frontier-collapsible-bowl': '프론티어 접이식 보울',
  'frontier-collapsible-3-piece-dinnerware': '프론티어 접이식 디너웨어 세트',
  'frontier-collapsible-6-piece-dinnerware': '프론티어 접이식 디너웨어 세트',
  'passage-bowl': '패시지 보울',
  'passage-dinnerware-set-7-piece-used': '패시지 디너웨어 세트',
  'passage-dinnerware-set': '패시지 디너웨어 세트',
  'passage-dinnerware-6-piece-set': '패시지 디너웨어 세트',
  // cutlery
  'camp-fork': '캠프 커틀러리 포크',
  'camp-knife': '캠프 커틀러리 나이프',
  'camp-cutlery-spoon-fork-knife-set': '캠프 커틀러리 세트',
  'camp-spoon': '캠프 커틀러리 스푼',
  'camp-kitchen-tool-kit-10-piece-set': '캠프 키친 툴 키트',
  'detour-stainless-steel-chopsticks': '디투어 젓가락',
  'detour-stainless-steel-cultery-set': '디투어 커틀러리 세트',
  'detour-stainless-steel-6-piece-cutlery-set': '디투어 커틀러리 세트',
  'detour-stainless-steel-kitchen-knife': '디투어 키친 나이프',
  'detour-stainless-steel-pairing-knife': '디투어 페어링 나이프',
  'detour-utensil-set': '디투어 커틀러리 세트',
  'folding-serving-spoon': '캠프 키친 폴딩 서빙 스푼',
  'folding-spatula': '캠프 키친 폴딩 스패츌라',
  'frontier-ultralight-cutlery-set': '프론티어 커틀러리 롱 핸들 세트',
  'frontier-ultralight-spork-knife-set': '프론티어 커틀러리 세트',
  'frontier-ultralight-cultery-set': '프론티어 커틀러리 세트',
  'frontier-ultralight-long-spoon': '프론티어 롱 핸들 스푼',
  'frontier-ultralight-spork': '프론티어 스포크',
  'frontier-ultralight-long-spork': '프론티어 롱 핸들 스포크',
  'frontier-ultralight-short-handle-spork': '프론티어 숏 핸들 스포크',
  'horizon-cutlery-set-2-piece': '호라이즌 커틀러리 세트',
  'passage-2-piece-cutlery-set': '패시지 커틀러리 세트',
  'passage-cutlery': '패시지 커틀러리 세트',
  // towel
  'airlite-towel': '에어라이트 타월',
  'drylite-towel': '드라이라이트 타월',
  'pocket-towel': '포켓 타월',
  'tek-towel': '텍 타월',
  // pouch
  'big-river-dry-backpack': '빅 리버 드라이 백팩',
  'the-big-river-dry-bag': '빅 리버 드라이 백',
  'dry-bag-sling': '드라이 백 슬링',
  'evac-compression-dry-bag-hd': '이벤트 컴프레션 드라이 백 헤비 듀티',
  'the-evac-compression-dry-bag': '이벤트 컴프레션 UL 드라이 백',
  'the-evac-dry-bag': '이벤트 드라이 백',
  'evac-compression-dry-bag-ul': '이벤트 컴프레션 UL 드라이 백',
  'lightweight-dry-bag': '라이트웨이트 드라이 백',
  'lightweight-first-aid-dry-bag': '라이트웨이트 퍼스트 에이드 드라이 백',
  'lightweight-dry-bag-set': '라이트웨이트 드라이 백 세트',
  'lightweight-dry-bag-view': '라이트웨이트 뷰 드라이 백',
  'lightweight-stuff-sack': '라이트웨이트 스터프 색',
  'lightweight-stuff-sack-set': '라이트웨이트 스터프 색 세트',
  'mesh-stuff-sack-set': '메쉬 스터프 색 세트',
  'ultra-sil-dry-bag': '울트라실 드라이 백',
  'ultra-sil-dry-bag-set': '울트라실 드라이 백 세트',
  'the-ultra-sil-stuff-sack': '울트라실 스터프 색',
  'the-ultra-sil-stuff-sack-set': '울트라실 스터프 색 세트',
};

// ── size → Korean ────────────────────────────────────────────────
const WORD = {
  regular: '레귤러', long: '롱', short: '숏', small: '스몰', large: '라지',
  wide: '와이드', rectangular: '렉탱귤러', contour: '컨투어', deluxe: '디럭스',
  double: '더블', tapered: '테이퍼드', standard: '스탠다드', extra: '엑스트라',
  xs: '엑스스몰', s: '스몰', m: '미디엄', l: '라지', xl: '엑스라지',
  "women's": '여성용', womens: '여성용', "men's": '남성용', mens: '남성용',
  piece: '피스', pack: '팩',
};
const SPECIAL = { 'default title': '', 'one size': '원사이즈', queen: '퀸', single: '싱글', king: '킹' };

const mapSizePart = (part) => {
  const p = part.trim();
  if (!p) return '';
  const low = p.toLowerCase();
  if (low in SPECIAL) return SPECIAL[low];
  const tf = p.match(/^(-?\d+)\s*°?\s*F$/i);
  if (tf) return `${Math.round((parseInt(tf[1], 10) - 32) * 5 / 9)}℃`;
  return p.replace(/[[\]]/g, ' ').split(/\s+/).filter(Boolean).map((w) => WORD[w.toLowerCase()] ?? w).join(' ');
};
const mapSize = (size) => (size || '').split('/').map(mapSizePart).filter(Boolean).join(' / ');

// ── color → Korean (KR-site style transliteration) ────────────────
const COLOR = {
  'beluga': '벨루가', 'spicy orange': '스파이시 오렌지', 'picante': '피칸테',
  'aqua sea': '아쿠아 씨', 'high rise': '하이 라이즈', 'surf the web': '서프 더 웹',
  'blue atoll': '블루 아톨', 'burnt olive': '번트 올리브', 'turkish tile': '터키시 타일',
  'zinnia': '지니아', 'desert': '데저트', 'sage': '세이지', 'sulphur': '설퍼',
  'arrowwood': '애로우우드', 'jet black': '제트 블랙', 'moonlight': '문라이트',
  'tarragon': '타라곤', 'moonlight blue': '문라이트 블루', 'grey': '그레이',
  'dull gold': '덜 골드', 'mediterranea': '메디테라네아', 'lime': '라임',
  'moonstruck': '문스트럭', 'magenta': '마젠타', 'navy': '네이비',
  'cendre blue': '센드레 블루', 'burnt orange': '번트 오렌지', 'outback': '아웃백',
  'baltic': '발틱', 'desert brown': '데저트 브라운', 'sage green': '세이지 그린',
  'cabbage': '캐비지', 'starfish': '스타피쉬', 'bombay brown': '봄베이 브라운',
  'sea foam': '씨 폼', 'puffins bill': '퍼핀스 빌', 'bone white': '본 화이트',
  'laurel wreath': '로렐 리스', 'blue': '블루', 'arrowwood yellow': '애로우우드 옐로우',
  'bombay': '봄베이', 'charcoal': '차콜',
};
const mapColor = (color) =>
  (color || '')
    .split('/')
    .map((c) => { const k = c.trim().toLowerCase(); return COLOR[k] ?? c.trim(); })
    .filter(Boolean)
    .join('/');

// Korean size words we care about for variant matching
const SIZE_WORDS = ['레귤러', '롱', '숏', '스몰', '미디엄', '라지', '엑스라지', '엑스스몰', '와이드', '사각', '더블', '싱글', '컨투어', '디럭스'];
// KR abbreviations → canonical Korean size word
const KR_ABBR = { LG: '라지', RG: '레귤러', MD: '미디엄', SM: '스몰', XL: '엑스라지', XSM: '엑스스몰', RT: '사각', LT: '롱' };

const sizeWordsOf = (text) => {
  const found = new Set();
  for (const w of SIZE_WORDS) if (text.includes(w)) found.add(w);
  for (const [ab, ko] of Object.entries(KR_ABBR)) {
    if (new RegExp(`(?:^|[^A-Za-z])${ab}(?:[^A-Za-z]|$)`).test(text)) found.add(ko);
  }
  // canonicalise rectangular: display '렉탱귤러' and KR '사각' are the same size for matching
  if (/렉탱귤러/.test(text)) found.add('사각');
  return found;
};
// volumes like 5L / 1.5L / 20 (litre)
const volumesOf = (text) => new Set([...text.matchAll(/(\d+(?:\.\d+)?)\s*(?:L|리터|litre|liter)\b/gi)].map((m) => m[1]));

// ── English token normalisation for model-line matching ──
const STOP = new Set(['the', 'with', 'and', 'a', 'of', 'for', 's2s', 'sea', 'to', 'summit', 'past', 'season', 'new',
  'sleeping', 'bag', 'pad', 'mat', 'mattress', 'air', 'insulated', 'self', 'inflating', 'si', 'down', 'synthetic',
  'series', 'womens', 'women', 'mens', 'men', 'ul', 'asc', 'rcs']);
const enTokens = (s) => new Set((s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter((t) => t && !STOP.has(t)));
const subset = (a, b) => { for (const t of a) if (!b.has(t)) return false; return true; };

// ── load data ────────────────────────────────────────────────────
const crawlFile = process.argv[2] ||
  readdirSync(outDir).filter((f) => /^sea-to-summit-\d+\.json$/.test(f)).sort().at(-1);
const crawl = JSON.parse(readFileSync(join(outDir, crawlFile)));
const ref = JSON.parse(readFileSync(join(outDir, 'seatosummit-kr-ref.json')));

const refParsed = ref
  .filter((r) => r.en && r.ko)
  .map((r) => ({
    ko: r.ko,
    en: r.en,
    tk: enTokens(r.en),
    tempC: (r.ko.match(/(-?\d+)\s*도/) ?? [])[1] != null ? parseInt(r.ko.match(/(-?\d+)\s*도/)[1], 10) : null,
    sizes: sizeWordsOf(r.ko),
    vols: volumesOf(r.ko),
    hasColor: /그린|그레이|블루|레드|오렌지|옐로우|블랙|타라곤|벨루가|인디고|내추럴|애플그린|네이비|차콜|퍼시픽|쉘|아로우|샌드|코랄/.test(r.ko),
    // pad type: 자충 → self-inflating, else air/insulated
    padType: /자충/.test(r.ko) ? 'self-inflating' : (/에어|인슐레이티드/.test(r.ko) ? 'air' : null),
    // bag fill: 다운 → down, else (침낭 without 다운) synthetic
    bagFill: /침낭/.test(r.ko) ? (/다운/.test(r.ko) ? 'down' : 'synthetic') : null,
    // tent TR code
    tr: ((r.en + ' ' + r.ko).match(/TR\s*(\d)/i) ?? [])[1] ?? null,
  }));

// US item → its key facts
const usFacts = (it, base) => {
  const tk = enTokens(base);
  const tempC = it.category === 'sleeping_bag' && typeof it.specs?.limitTemp === 'number' ? it.specs.limitTemp : null;
  const sizeKo = mapSize(it.size);
  const sizes = sizeWordsOf(sizeKo);
  const vols = new Set([...((it.size || '').matchAll(/(\d+(?:\.\d+)?)\s*L\b/gi))].map((m) => m[1]));
  const padType = it.category === 'mat' ? (it.specs?.type ?? null) : null;
  const bagFill = it.category === 'sleeping_bag' ? (it.specs?.fillMaterial ?? null) : null;
  const tr = ((it.size || '').match(/TR\s*(\d)/i) ?? [])[1] ?? null;
  return { tk, tempC, sizeKo, sizes, vols, padType, bagFill, tr };
};

// find best exact-variant KR match (model + temp + size + volume compatible)
const matchKR = (f) => {
  const cands = refParsed.filter((r) => {
    if (!f.tk.size || !subset(f.tk, r.tk)) return false;            // model line must be covered
    if (f.tempC != null && r.tempC !== f.tempC) return false;        // temp must match exactly
    if (f.tempC == null && r.tempC != null) return false;            // KR is a temp variant, US isn't → different
    // pad type (self-inflating vs air) must match
    if (f.padType && r.padType && f.padType !== r.padType) return false;
    // bag fill (down vs synthetic) must match
    if (f.bagFill && r.bagFill && f.bagFill !== r.bagFill) return false;
    // tent TR code must match
    if (f.tr && r.tr && f.tr !== r.tr) return false;
    if (f.tr && !r.tr) return false;
    // size compatibility: KR size words must not conflict with US size
    if (r.sizes.size && f.sizes.size && !subset(f.sizes, r.sizes)) return false;
    if (r.sizes.size && !f.sizes.size) return false;                 // KR pins a size we don't have
    // volume compatibility
    if (r.vols.size && f.vols.size && !subset(f.vols, r.vols)) return false;
    if (r.vols.size && !f.vols.size) return false;
    return true;
  });
  if (!cands.length) return null;
  // prefer: size present & no baked color, then no-color, then fewest tokens (closest)
  cands.sort((a, b) =>
    (b.sizes.size ? 1 : 0) - (a.sizes.size ? 1 : 0) ||
    (a.hasColor ? 1 : 0) - (b.hasColor ? 1 : 0) ||
    a.tk.size - b.tk.size);
  return cands[0];
};

// ── apply ────────────────────────────────────────────────────────
let matched = 0, generated = 0; const missing = new Set();
for (const it of crawl) {
  const slug = it.groupId.replace('sea-to-summit_', '');
  const koBase = KO_BASE[slug];
  if (!koBase) { missing.add(slug); }
  let base = it.name;
  if (it.size && base.endsWith(' ' + it.size)) base = base.slice(0, -(it.size.length + 1));

  const f = usFacts(it, base);
  it.sizeKorean = f.sizeKo;
  it.colorKorean = mapColor(it.color);

  const kr = matchKR(f);
  if (kr) {
    matched++;
    // KR name already conveys the variant if it covers our size words, volumes, and temp.
    const sizeCovered = !f.sizes.size || subset(f.sizes, kr.sizes);
    const volCovered = !f.vols.size || subset(f.vols, kr.vols);
    const tempCovered = f.tempC == null || kr.tempC === f.tempC;
    const covered = sizeCovered && volCovered && tempCovered;
    it.nameKorean = covered || !f.sizeKo ? kr.ko : `${kr.ko} ${f.sizeKo}`;
    it._krMatch = kr.en;
  } else {
    generated++;
    it.nameKorean = f.sizeKo ? `${koBase ?? base} ${f.sizeKo}` : (koBase ?? base);
  }
}

const stamp = Date.now();
const outPath = join(outDir, `sea-to-summit-ko-${stamp}.json`);
writeFileSync(outPath, JSON.stringify(crawl, null, 2));
console.log(`적용 완료: ${crawl.length}항목 (KR매칭 ${matched} / 생성 ${generated}) → ${outPath}`);
if (missing.size) console.log(`⚠️ KO_BASE 누락:`, [...missing].join(', '));

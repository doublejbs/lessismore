// 뉴미디엄(newmedium.kr/outside) — 식스샵(sixshop) 기반 멀티브랜드 편집숍. OUTSIDE 카테고리 4개(Pack/Sleep/Clothing/Acc).
// 리스팅은 JSON API, 한글명·스펙·옵션 이름은 상품 상세 서버렌더 HTML에서.
//
// ⚠ 리스팅 API: /apis/mall/shop/products-catalog?categories=…&npp=100&page=N
//    고정 헤더 `Authorization: Basic OTI5MTg=`(사이트 ID 92918) 필수. curl로 바로 받아진다.
//    thumbnails = 상품 사진 목록(순서대로). shopProductOptions[].optionImageSequence = 그 목록의 순번(색상 옵션 이미지).
// ⚠ 브랜드 필드가 없다 → 이름 앞부분으로 판별(BRANDS). 회사별 company/groupId 접두 분리(멀티브랜드 룰).
//    SOTO·Gossamer Gear·Samaya는 공식몰 어댑터로 이미 수집한 브랜드라 제외(사용자 확정 2026-09-30).
// ⚠ 한글명: 상세 설명의 「관련 상품」 다음 줄이 영문 제목, 그다음 줄이 한글명(한 줄에 붙은 경우도 있음).
//    한글명이 없는 상품(윈드스로우 컵 2종)은 KO_OVERRIDE로 음역. 브랜드 한글 접두는 떼고(제품명에 브랜드명 금지),
//    끝의 색상은 colorKorean으로 분리.
// ⚠ 색상: 대부분 옵션이 아니라 이름 끝("… Jacket Black Beauty"). COLOR_KO 사전의 최장 꼬리 일치로 분리.
//    일부는 색상이 옵션(Cnoc 물병, Igneous 물병, 카메라 숄더 등). 옵션 축은 data-option-index(0/1)로 구분하고
//    두 번째 축은 data-combined-option-value-no("색상번호, 사이즈번호")로 짝짓는다.
// ⚠ 무게: 리스팅 description과 상세 「+」 스펙 줄이 다를 때는 상세 스펙 우선(description은 복붙 오류가 있음:
//    Carbon Fiber Spool 30g vs 스펙 4.5g). 사이즈별 "xs-xl: 235, 249 … g", 키별 "S:12g, L:24g",
//    "Black 106g / Brindle 114g", "3 ml (8.5 g) / 15 ml (20 g)", 위치별 "250g / 350g" 패턴을 옵션과 매칭.
//    반올림 금지(사이트 표기 그대로).
import { execFileSync } from 'node:child_process';

const BASE = 'https://www.newmedium.kr';
const IMG = 'https://contents.sixshop.com';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const CATEGORIES = '932421,976805,932429,932428'; // Pack, Sleep, Clothing, Acc

// ── 브랜드: 이름 접두(영문) → company / 한글 / 한글명 접두 ──
// company·companyKorean은 DB 기존 표기에 맞춘다(Pa'lante=파란테·SEALSON=씰슨·Mountain Hardwear·Malachowski는 사용자 입력분이
// 이미 있음. 사이트 표기 '팔란테'·'실슨'이 아니라 기존 등록 표기로 통일 — 사용자 결정 2026-10).
const BRANDS = [
  { en: /^Rayon Vert x Sealson\s*/i, company: 'SEALSON', ko: '씰슨', koPre: /^레이온\s*버트\s*x\s*(실슨|씰슨)\s*/, collab: 'Rayon Vert' },
  { en: /^JOSHUA TREE\s*/i, company: 'Joshua Tree', ko: '조슈아 트리', koPre: /^조슈아\s*트리\s*/ },
  { en: /^Portal\s*/i, company: 'Portal', ko: '포탈', koPre: /^포탈\s*/ },
  { en: /^Igneous Gear\s*/i, company: 'Igneous Gear', ko: '이그니어스 기어', koPre: /^이그니어스\s*기어\s*/ },
  { en: /^Pa'lante\s*/i, company: "Pa'lante", ko: '파란테', koPre: /^(팔란테|파란테)\s*/ },
  { en: /^alpacks\s*/i, company: 'Alpacks', ko: '알팩스', koPre: /^알팩스\s*/ },
  { en: /^atelierBluebottle\s*[-–]?\s*/i, company: 'atelierBluebottle', ko: '아틀리에블루보틀', koPre: /^아틀리에\s*블루보틀\s*/ },
  { en: /^Windthrow\s*/i, company: 'Windthrow', ko: '윈드스로우', koPre: /^윈드스로우\s*/ },
  { en: /^Gundri\s*[-–]?\s*/i, company: 'Gundri', ko: '군드리', koPre: /^군드리\s*[-–]?\s*/ },
  { en: /^Meadowphysics\s*/i, company: 'Meadowphysics', ko: '메도우피직스', koPre: /^메도우피직스\s*/ },
  { en: /^Sealson\s*/i, company: 'SEALSON', ko: '씰슨', koPre: /^(실슨|씰슨)\s*/ },
  { en: /^Cnoc Outdoors\s*/i, company: 'Cnoc Outdoors', ko: '크녹아웃도어', koPre: /^크녹\s*아웃도어\s*/ },
  { en: /^Matter Of\s*&\s*Velo Temp\s*[-–]?\s*/i, company: 'Matter Of', ko: '매터 오브', koPre: /^매터\s*오브\s*&\s*벨로\s*템프\s*[-–]?\s*/, collab: 'Velo Temp' },
  { en: /^Mountain Hardwear\s*/i, company: 'Mountain Hardwear', ko: '마운틴하드웨어', koPre: /^마운틴\s*하드웨어\s*/ },
  { en: /^Spuds Adventure Gear\s*[-–]?\s*/i, company: 'Spuds Adventure Gear', ko: '스퍼즈 어드벤처 기어', koPre: /^스퍼즈\s*어드벤처\s*기어\s*[-–―]?\s*/ },
  { en: /^GoLite\s*/i, company: 'GoLite', ko: '고라이트', koPre: /^고라이트\s*/ },
  { en: /^Lasal Gear\s*/i, company: 'Lasal Gear', ko: '라살 기어', koPre: /^라살\s*기어\s*/ },
  { en: /^Malachowski\s*/i, company: 'Malachowski', ko: '말라코프스키', koPre: /^말라코프스키\s*/ },
];
// 공식몰 어댑터로 이미 수집한 브랜드 — 수집 안 함
const EXCLUDE_BRAND = /^(SOTO|Gossamer\s*gear|Samaya)\b/i;
// DB에 같은 제품·같은 사이즈가 이미 있어 제외(사용자 규칙: 같은 사이즈면 안 올림)
const EXCLUDE_NAME = [/^Malachowski Ultralight III 500 Sleeping bag$/i];

// 영문명 보정: 상품명 자체에 브랜드명이 들어간 문구(제품명에 브랜드명 금지 룰)
const EN_OVERRIDE = {
  "GoLite 'Therefore I GoLite' Grocery bag": 'Grocery Bag',
};
// 텍스트에 무게가 없어 상세 이미지 OCR로 찾은 값(2026-10). 커피: 포장지 "5g PACKET" × 설명 "상자당 6개"
const WEIGHT_OVERRIDE = {
  'Windthrow Big Day Out Instant Coffee': 30,
};
// 한글명이 페이지에 없는 상품 → 음역(SKILL 룰)
const KO_OVERRIDE = {
  "GoLite 'Therefore I GoLite' Grocery bag": '그로서리 백',
  "Pa'lante Turtle Pack Black Robic": '터틀팩 블랙 로빅', // 사이트 한글명이 '터틀팩 글래시어'(다른 색 문구 복붙)
  'Sealson RB36 Fastpack White': 'RB36 패스트팩 화이트', // 사이트 한글명 '스톰 화이트'(Storm Grey 문구 복붙)
  "Pa'lante V2 Pack Black Ultraweave + Foam Pad": 'V2 팩 블랙 울트라위브 + 폼패드',
  'Windthrow Titanium Cup 420ml': '티타늄 컵 420ml',
  'Windthrow Camp Mug 12oz': '캠프 머그 12oz',
};

// ── 색상(이름 끝 / 옵션) 영→한. 키는 소문자. 최장 꼬리 일치로 이름에서 분리한다. ──
const COLOR_KO = {
  'black beauty': '블랙 뷰티', 'dark olive': '다크 올리브', 'blue graphite': '블루 그라파이트', greige: '그레이지',
  'sea turtle': '씨 터틀', 'bone white': '본 화이트', beluga: '벨루가', 'dusky green': '더스키 그린', 'desert taupe': '데저트 토프',
  'slate black': '슬레이트 블랙', blue: '블루', black: '블랙', lime: '라임', green: '그린', moonstone: '문스톤', blackout: '블랙아웃',
  purple: '퍼플', 'glacier blue': '글레이셔 블루', sand: '샌드', clear: '클리어', 'gray ultraweave': '그레이 울트라위브', hemp: '헴프',
  'black grid mesh': '블랙 그리드 메쉬', iris: '아이리스', brown: '브라운', oat: '오트', crush: '크러시', moonwalk: '문워크',
  'black gridstop': '블랙 그리드스탑', 'white ultraweave': '화이트 울트라위브', 'black ultraweave': '블랙 울트라위브',
  'black robic': '블랙 로빅', 'glacier ultraweave': '글레이셔 울트라위브', 'copper robic': '코퍼 로빅', 'storm grey': '스톰 그레이',
  white: '화이트', 'turmeric yellow': '터메릭 옐로', grape: '그레이프', chocolate: '초콜릿', khorne: '콘', dunlop: '던롭',
  yellow: '옐로', orange: '오렌지', 'malachite blue': '말라카이트 블루', 'orange gray': '오렌지 그레이', 'walnut husk': '월넛 허스크',
  'yellow/black': '옐로/블랙', khaki: '카키', moss: '모스', navy: '네이비', 'brown/green': '브라운/그린', 'dawn blue': '던 블루',
  'light moss': '라이트 모스', twilight: '트와일라잇', 'light blue': '라이트 블루', 'ghost white': '고스트 화이트',
  'forest green': '포레스트 그린', 'sage blue': '세이지 블루', 'light green': '라이트 그린', 'light gray': '라이트 그레이',
  'pine/black': '파인/블랙', 'pine/lichen': '파인/라이켄', 'daisy/lichen': '데이지/라이켄', 'autumn forest': '어텀 포레스트',
  'lichen green/black': '라이켄 그린/블랙', 'lichen green': '라이켄 그린', lavender: '라벤더', lichen: '라이켄', burgundy: '버건디',
  'midnight blue': '미드나잇 블루', snowmelt: '스노우멜트', gray: '그레이', 'ash gray': '애시 그레이', 'deep green': '딥 그린',
  brindle: '브린들', 'cz-gray': 'CZ 그레이', 'luminous white': '루미너스 화이트', 'carbon blue': '카본 블루', apricot: '애프리콧',
  'night blue': '나이트 블루', 'mountain red': '마운틴 레드', abocad: '아보카드', 'ebony black': '에보니 블랙',
  'pebblle beige': '페블 베이지', tabak: '타박', 'gray/black': '그레이/블랙', basalt: '바살트', serpentine: '서펜타인',
  amethyst: '아메시스트', 'dark gray': '다크 그레이', 'heather gray': '헤더 그레이',
};
// 한글 색상 단어(사이트 한글명 꼬리가 진짜 색상인지 판별용)
const KO_COLOR_WORDS = new Set([...Object.values(COLOR_KO).flatMap((v) => v.split(/[\s/]+/)), '라이켄', '리켄', '리첸', '스톰', '옐로우', '크러쉬', '코른', '타프', '글레시어', '글래시어', '맬러카이트', '멜란지', '카멜', '아이보리']);
const COLOR_KEYS = Object.keys(COLOR_KO).sort((a, b) => b.split(' ').length - a.split(' ').length || b.length - a.length);
const titleColor = (s) => (s === s.toUpperCase() ? s.toLowerCase() : s).replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/^Cz-/, 'CZ-');

const SIZE_KO = {
  XS: '엑스스몰', S: '스몰', M: '미디엄', L: '라지', XL: '엑스라지', SMALL: '스몰', MEDIUM: '미디엄', LARGE: '라지',
  'S/M': '스몰/미디엄', 'L/XL': '라지/엑스라지', 'XS-S': '엑스스몰-스몰', 'M-XL': '미디엄-엑스라지',
};

const sleep = (ms) => execFileSync('sleep', [String(ms / 1000)]);
const curl = (url, headers = [], marker = null, retries = 4) => {
  for (let i = 0; i < retries; i++) {
    try {
      const args = ['-s', '--compressed', '-A', UA, ...headers.flatMap((h) => ['-H', h]), url];
      const out = execFileSync('curl', args, { maxBuffer: 64 * 1024 * 1024, encoding: 'utf-8' });
      if (out && out.length > 200 && (!marker || out.includes(marker))) return out;
    } catch (e) {
      /* 재시도 */
    }
    sleep(400 * (i + 1));
  }
  return '';
};
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
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&middot;/g, '·')
    .replace(/&times;/g, '×')
    .replace(/&hellip;/g, '…')
    .replace(/&[lr]squo;/g, "'")
    .replace(/&[lr]dquo;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const norm = (s) => (s || '').replace(/[\s ]+/g, ' ').replace(/[’‘]/g, "'").trim();

// ── 상세 HTML 파싱: 한글명, 「+」 스펙 줄, 옵션 축 ──
const parseDetail = (html) => {
  const i = html.indexOf('productDescriptionDetailPage');
  const body = decode((i >= 0 ? html.slice(i) : html).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '\n'));
  const lines = body.split('\n').map(norm).filter(Boolean);
  const k = lines.indexOf('관련 상품');
  const after = k >= 0 ? lines.slice(k + 1, k + 4) : [];
  let ko = '';
  if (after.length) {
    const m = after[0].search(/[가-힣]/);
    if (m >= 0) ko = after[0].slice(m);
    else ko = (after[1] || '').startsWith('+') ? after[2] || '' : after[1] || '';
  }
  if (!/[가-힣]/.test(ko) || ko.length > 60 || /(니다|요)\.?$/.test(ko)) ko = '';
  const spec = lines.filter((l) => l.startsWith('+')).map((l) => l.replace(/^\+\s*/, '')).filter(Boolean);
  // 옵션: data-option-index 0/1, 두 번째 축은 combined "a, b"
  const opts = [...html.matchAll(/<div class='custom-select-option[^']*'([^>]*)>/g)]
    .map((m) => Object.fromEntries([...m[1].matchAll(/data-([a-z-]+)='([^']*)'/g)].map((x) => [x[1], decode(x[2])])))
    .filter((a) => a['option-value']);
  const axis0 = [];
  const axis1 = [];
  const seen = new Set();
  for (const a of opts) {
    const key = `${a['option-index']}|${a['combined-option-value-no']}|${a['option-value']}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (a['option-index'] === '0') axis0.push({ no: a['combined-option-value-no'], value: a['option-value'] });
    else axis1.push({ nos: (a['combined-option-value-no'] || '').split(/\s*,\s*/), value: a['option-value'] });
  }
  return { ko, spec, axis0, axis1 };
};

// ── 옵션 값 분류 ──
const isColorValue = (v) => !!COLOR_KO[v.toLowerCase().replace(/\s+[가-힣].*$/, '')];
const splitBilingual = (v) => {
  // "basalt 바살트" → en basalt / ko 바살트
  const m = v.match(/^([A-Za-z][A-Za-z\s/-]*?)\s+([가-힣].*)$/);
  return m ? { en: m[1].trim(), ko: m[2].trim() } : { en: v, ko: '' };
};
const sizeEnKo = (raw) => {
  const v = norm(raw);
  // 팔란테 등판: '16" 등판 40cm, 31L' / '19" 등판 48cm long, 37L' / '16" 등판-40cm, 31L'
  const t = v.match(/^(\d+)"\s*등판[-\s]*(\d+)\s*cm(\s*long)?,\s*([\d.]+)\s*L$/i);
  if (t) return { en: `${t[1]}" Torso ${t[2]}cm${t[3] ? ' Long' : ''} / ${t[4]}L`, ko: `${t[1]}인치 등판 ${t[2]}cm${t[3] ? ' 롱' : ''} ${t[4]}L` };
  const sq = v.match(/^(\d+)\s*cm Square$/i);
  if (sq) return { en: v, ko: `${sq[1]}cm 스퀘어` };
  const up = v.toUpperCase();
  if (SIZE_KO[up]) return { en: /^(small|medium|large)$/i.test(v) ? v[0].toUpperCase() + v.slice(1).toLowerCase() : up, ko: SIZE_KO[up] };
  return { en: v, ko: v }; // 22-24 cm / 2L / 3 ml / 28mm — 단위 표기는 한글 필드에도 그대로
};

// ── 이름에서 색상 꼬리 분리 ──
const splitColor = (name) => {
  let rest = norm(name);
  let extra = '';
  const plus = rest.match(/\s*\+\s*(.+)$/); // "… Pine/Black + Foam Pad" → 구성품은 이름에 남긴다
  if (plus) {
    extra = ` + ${plus[1]}`;
    rest = rest.slice(0, plus.index);
  }
  const low = rest.toLowerCase();
  for (const c of COLOR_KEYS) {
    if (low === c) continue;
    if (low.endsWith(` ${c}`)) return { base: rest.slice(0, rest.length - c.length).trim() + extra, color: titleColor(rest.slice(rest.length - c.length)) };
  }
  return { base: rest + extra, color: '' };
};
// 한글명에서 색상 꼬리 제거: 영문 색상 단어 수만큼 한글 끝 토큰을 뗀다(사이트 한글 색상명을 그대로 colorKorean으로)
const splitColorKo = (ko, colorEn) => {
  let rest = norm(ko);
  let extra = '';
  const plus = rest.match(/\s*\+?\s*(폼\s?패드|조이\s?스트랩)$/) || rest.match(/\s*\+\s*(.+)$/);
  if (plus) {
    extra = ` + ${plus[1].replace(/\s+/g, '')}`;
    rest = rest.slice(0, plus.index).trim();
  }
  if (!colorEn) return { base: rest + extra, colorKo: '' };
  const want = COLOR_KO[colorEn.toLowerCase()] || '';
  if (want && rest.endsWith(` ${want}`)) return { base: rest.slice(0, -want.length).trim() + extra, colorKo: want };
  const n = colorEn.split(/\s+/).length;
  const toks = rest.split(' ');
  for (let k = n; k >= 1; k--) {
    const tail = toks.slice(-k);
    if (toks.length > k && tail.every((t) => t.split('/').every((w) => KO_COLOR_WORDS.has(w)))) {
      // 사이트 한글 색상이 영문보다 짧으면(Black Robic ↔ 블랙) 사전 번역으로 색상명을 채운다
      return { base: toks.slice(0, -k).join(' ') + extra, colorKo: k === n ? tail.join(' ') : want || tail.join(' ') };
    }
  }
  return { base: rest + extra, colorKo: want }; // 한글명에 색상이 없으면 사전 번역
};

// ── 카테고리(영문 이름 기준, 핸드오프 §3 조리 규칙 순서 준수) ──
const classify = (en) => {
  const s = en.toLowerCase();
  if (/sleeping bag/.test(s)) return 'sleeping_bag';
  if (/cargo vest/.test(s)) return 'vest_pack'; // 10L 수납 러닝 베스트
  if (/\bpack\b|backpack|fastpack|pac-lite|pac-bit/.test(s)) return 'backpack';
  if (/crossbody|sacoche|pouch|sidebag|camera shoulder|chalk bucket|trash bag|tote|grocery bag/.test(s)) return 'pouch';
  if (/glove/.test(s)) return 'gloves';
  if (/bottle|water container|thrubottle|vesica/.test(s)) return 'bottle';
  if (/cups?\b|mug/.test(s)) return 'cup';
  // 조리는 crawl-pipeline-category-handoff.md §3 문자열 규칙을 그대로 따른다(앱 이관 결과와 일치시키기 위함)
  if (/pot hopper/.test(s)) return 'cookware'; // §3: 'pot\b'·'팟' → cookware
  if (/fuel stand/.test(s)) return 'cookware_etc'; // §3: 버너/스토브/연료통 등 어느 규칙에도 안 걸림 → cookware_etc
  if (/reflective cord|carbon fiber spool/.test(s)) return 'tent_acc'; // 가이라인 코드
  if (/tenugui/.test(s)) return 'towel';
  if (/cushion/.test(s)) return 'furniture_etc';
  if (/coffee/.test(s)) return 'food';
  if (/jacket|vest|hood|\bt\b|tee|shirt|pant|short|skirt|sock|beanie|hat|belt|under|haramaki|mant/.test(s)) return 'clothing';
  return 'etc';
};

// ── 무게(g) — 변형별. texts: [상세 스펙 줄…, description] ──
const num = (s) => parseFloat(String(s).replace(/,/g, ''));
const weightFor = (texts, ctx) => {
  const { size, color, sizes, colors } = ctx;
  const all = texts.filter(Boolean);
  const gLines = all.filter((t) => /\d\s*g\b/i.test(t) && !/kg\b|gsm|g\/m/i.test(t) && !/^\d+(\.\d+)?\s*oz\b/i.test(t));
  const keyMatch = (k, v) => {
    if (!v) return false;
    const a = k.toLowerCase().replace(/사이즈|size/g, '').trim();
    const b = v.toLowerCase().replace(/사이즈|size/g, '').trim();
    return a === b || a.split(/\s*\/\s*/).includes(b);
  };
  for (const t of gLines) {
    // "xs-xl: 235, 249, 263, 292, 323 g" — XS~XL 순
    const r = t.match(/xs\s*-\s*xl\s*:\s*([\d.,\s]+)g/i);
    if (r && size) {
      const vals = r[1].split(',').map(num).filter((x) => !Number.isNaN(x));
      const idx = ['XS', 'S', 'M', 'L', 'XL'].indexOf(size.toUpperCase());
      if (idx >= 0 && vals[idx]) return vals[idx];
    }
    // 키: "S:12g, L:24g" / "Black 106g / Brindle 114g" / "3 ml (8.5 g) / 15 ml (20 g)" / "Medium: 86g"
    const segs = [...t.matchAll(/([A-Za-z][A-Za-z\s/-]*?|\d+\s*ml)\s*[:(]?\s*([\d.]+)\s*g\)?/gi)].map((m) => ({ k: m[1].trim(), g: num(m[2]) }));
    const hit = segs.find((s) => keyMatch(s.k, size) || keyMatch(s.k, color) || (size && keyMatch(s.k, size.replace(/\s+/g, ' '))));
    if (hit && segs.length > 1) return hit.g;
  }
  // 세트 구성(치수와 함께 구성품별 무게: "손수건 H36 × W88 cm, 34g / 파우치 H12.5 × W14 cm, 7g") → 합산
  for (const t of gLines) {
    const gv = [...t.matchAll(/(\d+(?:\.\d+)?)\s*g\b/gi)].map((m) => num(m[1]));
    if (gv.length > 1 && /[×x]\s*W?\s*\d/i.test(t)) return Math.round(gv.reduce((x, y) => x + y, 0) * 100) / 100;
  }
  // 위치: 한 줄에 무게가 옵션 수만큼(예: "250g / 350g", "10.1g, 18g", description "12, 24g")
  const opt = sizes.length > 1 ? { list: sizes, v: size } : colors.length > 1 ? { list: colors, v: color } : null;
  if (opt && opt.v) {
    for (const t of [...gLines, ...all]) {
      const gVals = [...t.matchAll(/(\d+(?:\.\d+)?)\s*g\b/gi)].map((m) => num(m[1]));
      const bare = [...t.matchAll(/(\d+(?:\.\d+)?)\s*(?=g\b|,)/gi)].map((m) => num(m[1])); // "12, 24g"
      const vals = gVals.length === opt.list.length ? gVals : /^[\d.,\s]+g$/i.test(t.trim()) ? bare : [];
      if (vals.length === opt.list.length) {
        const idx = opt.list.indexOf(opt.v);
        if (idx >= 0) return vals[idx];
      }
    }
  }
  for (const t of gLines) {
    const tot = t.match(/총\s*([\d.]+)\s*g/);
    if (tot) return num(tot[1]);
    const per = t.match(/(?:패치\s*당|per patch)\s*([\d.]+)\s*g/i);
    if (per) {
      const cnt = all.join(' ').match(/(\d+)\s*매입/);
      return cnt ? Math.round(num(per[1]) * Number(cnt[1]) * 100) / 100 : num(per[1]);
    }
    const m = t.match(/(\d+(?:\.\d+)?)\s*g\b/i);
    if (m) return num(m[1]);
  }
  return 0;
};

// ── 용량 ──
const litersIn = (texts, size, desc = '') => {
  // 사이즈 문자열에 용량이 있으면 우선("16" Torso 40cm / 31L")
  const sm = (size || '').match(/([\d.]+)\s*L\b/);
  if (sm) return sm[1];
  for (const t of [desc, ...texts].filter(Boolean)) {
    const m = t.match(/(?:^|[\s,(:])(\d+(?:\.\d+)?)\s*L\b(?!\s*[/x×])/) || t.match(/(\d+(?:\.\d+)?)\s*L\s*\(/);
    if (m) return m[1];
  }
  return '';
};
const mlIn = (texts, name, size) => {
  const s = (size || '').match(/^([\d.]+)\s*(ml|L)$/i);
  if (s) return String(Math.round(s[2].toLowerCase() === 'l' ? num(s[1]) * 1000 : num(s[1])));
  for (const t of [name, ...texts]) {
    const ml = t.match(/([\d.]+)\s*ml\b/i);
    if (ml) return String(Math.round(num(ml[1])));
    const oz = t.match(/([\d.]+)\s*oz\b/i);
    if (oz && /mug|cup|온스/i.test(name + t)) return String(Math.round(num(oz[1]) * 29.5735));
    const l = t.match(/(?:^|[\s(])([\d.]+)\s*(?:L|리터)\b/);
    if (l) return String(Math.round(num(l[1]) * 1000));
  }
  return '';
};
const MATERIAL_RE = /%|nylon|polyester|merino|wool|cotton|dyneema|dcf|ultra\s?200|ultragrid|ultrastretch|x-pac|robic|gridstop|ultraweave|uhmwpe|polartec|hdpe|\bpp\b|silicone|titanium|aluminum|carbon fiber|sail cloth|hemp|나일론|폴리|면 \d|실리콘|티타늄|아크릴|메리노|ecopak|challenge/i;
const materialIn = (spec) => {
  const ok = (t) =>
    MATERIAL_RE.test(t) &&
    !/모델|착용|size|사이즈|made in|BPA and PVC|마운트|나사/i.test(t) &&
    !/(니다|요)\.?$/.test(t) &&
    (t.match(/\d\s*g\b/gi) || []).length < 2 &&
    t.length < 160;
  const m = spec.find(ok);
  return m ? m.replace(/^\d+(\.\d+)?\s*g\s*,\s*/i, '').replace(/\s+/g, ' ').trim() : '';
};

const buildSpecs = (cat, ctx) => {
  const { texts, spec, name, size, desc } = ctx;
  const s = {};
  const material = materialIn(spec);
  if (cat === 'backpack' || cat === 'vest_pack') {
    const v = litersIn(texts, size, desc);
    if (v) s.volume = v;
    if (material) s.material = material;
  } else if (cat === 'pouch') {
    const v = litersIn(texts, size, desc);
    if (v) s.capacity = v;
    if (material) s.material = material;
  } else if (cat === 'bottle' || cat === 'cup') {
    const ml = mlIn(texts, name, size);
    if (ml) s.capacity = ml;
    if (material) s.material = material;
  } else if (material) {
    s.material = material;
  }
  return s;
};

const slugify = (s) =>
  norm(s)
    .toLowerCase()
    .replace(/['’"®]/g, '')
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');
const imgUrl = (p) => (p ? `${IMG}${p.startsWith('/') ? '' : '/'}${p}` : '');

const buildRows = (p) => {
  const brand = BRANDS.find((b) => b.en.test(p.name));
  if (!brand) {
    console.warn(`[newmedium] ⚠ 브랜드 미판별: ${p.name}`);
    return [];
  }
  const html = curl(`${BASE}/product/${p.address}`, [], 'productDescriptionDetailPage');
  const d = parseDetail(html);
  const unquote = (x) => x.replace(/(^|\s)['‘’]([^'‘’]+)['‘’](?=\s|$)/g, '$1$2');
  const rawEn = unquote(EN_OVERRIDE[p.name] || norm(p.name.replace(brand.en, '')));
  let { base: nameEn, color: nameColor } = splitColor(rawEn);
  if (brand.collab) nameEn = `${nameEn} (${brand.collab} Collab)`;
  const koRaw = unquote(norm((KO_OVERRIDE[p.name] || d.ko).replace(brand.koPre, '')));
  let { base: nameKo, colorKo: nameColorKo } = splitColorKo(koRaw, nameColor);
  if (brand.collab) nameKo = `${nameKo} (${brand.collab === 'Rayon Vert' ? '레이온 버트' : '벨로 템프'} 콜라보)`;
  const category = classify(rawEn);
  const desc = norm(p.description || '');
  const texts = [...d.spec, desc];

  // 옵션 축 판별: 값이 전부 색상이면 색상축, 아니면 사이즈축
  const ax0Color = d.axis0.length && d.axis0.every((o) => isColorValue(o.value));
  const colorOpts = ax0Color ? d.axis0 : d.axis1.length && d.axis1.every((o) => isColorValue(o.value)) ? d.axis1 : [];
  const sizeAxis = ax0Color ? d.axis1 : d.axis0.length && !ax0Color ? d.axis0 : [];
  const sizeVals = [...new Set(sizeAxis.map((o) => o.value))];
  const colorVals = [...new Set(colorOpts.map((o) => splitBilingual(o.value).en))];

  // 용량이 빠진 사이즈('19" 등판 48cm long')는 같은 인치 형제 사이즈의 용량을 붙인다
  const longSizeL = (v) => {
    const inch = (v || '').match(/^(\d+)"/);
    if (!inch || /L$/.test(v)) return v;
    const sib = sizeVals.find((x) => x.startsWith(`${inch[1]}"`) && /([\d.]+)\s*L$/.test(x));
    return sib ? `${v}, ${sib.match(/([\d.]+)\s*L$/)[1]}L` : v;
  };
  // 변형 조합: (색상, 사이즈). 리스팅 shopProductOptions의 optionValueNo1/2와 옵션 번호로 짝짓기
  const combos = [];
  const valByNo = Object.fromEntries([...d.axis0.map((o) => [o.no, o.value])]);
  const ax1ByPair = {};
  for (const o of d.axis1) ax1ByPair[o.nos.join(',')] = o.value;
  for (const so of p.shopProductOptions || []) {
    const v0 = valByNo[String(so.optionValueNo1)] || '';
    const v1 = so.optionValueNo2 ? ax1ByPair[`${so.optionValueNo1},${so.optionValueNo2}`] || '' : '';
    const colorV = ax0Color ? v0 : colorOpts.length ? v1 : '';
    const sizeV = ax0Color ? v1 : v0;
    combos.push({ colorV, sizeV, imgSeq: so.optionImageSequence });
  }
  if (!combos.length) combos.push({ colorV: '', sizeV: '', imgSeq: 0 });

  const company = brand.company;
  const groupId = `${slugify(company)}_${slugify(nameEn)}`;
  const thumbs = p.thumbnails || [];
  const rows = [];
  const seen = new Set();
  for (const c of combos) {
    const bc = c.colorV ? splitBilingual(c.colorV) : null;
    const color = bc ? titleColor(bc.en) : nameColor;
    const colorKorean = bc ? bc.ko || COLOR_KO[bc.en.toLowerCase()] || '' : nameColorKo;
    const sz = c.sizeV ? sizeEnKo(longSizeL(c.sizeV)) : null;
    let size = sz ? sz.en : '';
    let sizeKorean = sz ? sz.ko : '';
    const key = `${color}|${size}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const specs = buildSpecs(category, { texts, spec: d.spec, name: rawEn, size: longSizeL(c.sizeV || ''), desc });
    if (!size && (category === 'backpack' || category === 'vest_pack') && specs.volume) {
      size = `${specs.volume}L`; // 배낭은 사이즈 옵션이 없으면 용량을 사이즈로(SKILL 룰)
      sizeKorean = size;
    }
    const weight = WEIGHT_OVERRIDE[p.name] ?? weightFor(texts, { size: c.sizeV ? norm(c.sizeV) : '', color: bc ? bc.en : '', sizes: sizeVals, colors: colorVals });
    const img = imgUrl(thumbs[c.imgSeq] || thumbs[0] || '');
    rows.push({
      groupId,
      category,
      company,
      companyKorean: brand.ko,
      // 사이즈는 예외 없이 이름 끝에 부착(영문 " / size", 한글 " sizeKorean")
      name: size ? `${nameEn} / ${size}` : nameEn,
      nameKorean: sizeKorean ? `${nameKo} ${sizeKorean}` : nameKo,
      color,
      colorKorean,
      size,
      sizeKorean,
      weight,
      imageUrl: img,
      specs,
      _detailUrl: `${BASE}/product/${p.address}`,
      _source: `newmedium_${category}`,
      _price: p.price?.regularPrice || 0,
      _soldOut: !!p.soldOut,
      _siteName: p.name,
    });
  }
  return rows;
};

export { classify, splitColor, splitColorKo, weightFor, sizeEnKo, parseDetail };

export default {
  name: 'newmedium',
  company: 'newmedium',
  companyKorean: '뉴미디엄',
  baseUrl: `${BASE}/outside`,
  defaultCategories: ['all'],
  crawl: async () => {
    const products = [];
    const seen = new Set();
    for (let page = 0; page < 20; page++) {
      const url = `${BASE}/apis/mall/shop/products-catalog?page=${page}&npp=100&categories=${CATEGORIES}&customerGradeNo=-2&orderType=PRODUCT_ORDER_NO&useSortedBySoldOutAllPage=use&customerNo=0`;
      let j = null;
      try {
        j = JSON.parse(curl(url, ['Authorization: Basic OTI5MTg=', 'X-Requested-With: XMLHttpRequest']));
      } catch (e) {
        j = null;
      }
      if (!j || !j.content || !j.content.length) break;
      for (const p of j.content) if (!seen.has(p.id)) seen.add(p.id) && products.push(p);
      if (j.last) break;
    }
    const target = products.filter((p) => !EXCLUDE_BRAND.test(p.name) && !EXCLUDE_NAME.some((re) => re.test(norm(p.name))));
    console.log(`[newmedium] 리스팅 ${products.length}개 → 대상 ${target.length}개(제외 브랜드·DB 중복 제외)`);
    const rows = [];
    target.forEach((p, i) => {
      rows.push(...buildRows(p));
      console.log(`[newmedium]   ${p.name} (${i + 1}/${target.length})`);
    });
    console.log(`[newmedium] 완료 ${target.length}개 상품 / ${rows.length}행`);
    return rows;
  },
};

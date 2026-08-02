// 제로그램 (zerogram.co.kr) — 자체 SPA(Vue) + JSON API 쇼핑몰.
// 리스팅: GET /api/category/<code>?limit=100&page=N (x-total-count 헤더로 페이지네이션).
//   컬러 옵션·이미지가 리스팅 응답에 이미 포함(colors[].optionVal/repImg) → 상세 페이지 없이 확보.
// 카테고리: repDisplayCateCode는 null이거나 부정확(선글라스/랜턴 등도 001011 GEAR ACC catch-all로
//   찍힘)해서 신뢰 불가 — 대신 "어느 leaf 카테고리에서 크롤됐는지"를 1차 신호로 쓰고, 컵/쿡웨어/
//   체어·스틱/가방/타프·쉘터처럼 한 leaf에 여러 내부 카테고리가 섞인 곳만 상품명 키워드로 refine.
// 무게/스펙: 상세페이지가 텍스트 스펙 없이 전부 마케팅 "설명 이미지"(zenout01.cafe24.com)라 코베아
//   케이스와 동일 — 이 어댑터는 _specImages만 수집하고 weight/specs는 0/{}로 둔다(별도 OCR 필요).
const BASE = 'https://www.zerogram.co.kr';
const IMG_BASE = 'https://image.zerogram.co.kr/';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// leaf 카테고리 코드 → 내부 카테고리 키 (문자열) 또는 상품명으로 판별하는 함수.
// 구체적인 코드부터 나열 — crawlCategory가 전역 dedup을 하므로 뒤에 나오는(특히 001011 catch-all)
// 코드는 앞에서 이미 분류된 itemCode를 덮어쓰지 않고 새 아이템만 채운다.
const LEAF_CATEGORIES = [
  { code: '001001001', cat: 'tent' }, // 텐트 1P~1.5P
  { code: '001001002', cat: 'tent' }, // 텐트 2P~2.5P
  {
    code: '001001006', // 타프/쉘터 (단품 타프폴은 텐트/타프 부속품이라 tent_acc)
    cat: (n) => {
      if (/^UL\s*카본\s*타프폴/.test(n)) return 'tent_acc';
      return /쉘터/.test(n) ? 'shelter' : 'tarp';
    },
  },
  { code: '001001005', cat: 'tent_acc' }, // 텐트 옵션
  { code: '001003001', cat: 'sleeping_bag' }, // 침낭
  { code: '001003003', cat: 'mat' }, // 슬리핑 패드
  {
    code: '001004001', // 가방 - 트레킹
    cat: (n) => {
      if (/패니팩|멜빵파우치|벨트파우치/.test(n)) return 'vest_pack';
      if (/플로깅백/.test(n)) return 'pouch';
      return 'backpack';
    },
  },
  {
    code: '001004002', // 가방 - 라이프 스타일
    cat: (n) => (/스터프색|토트백/.test(n) ? 'pouch' : 'backpack'),
  },
  {
    code: '001009', // 체어/스틱
    cat: (n) => (/체어/.test(n) ? 'chair' : /트레킹폴/.test(n) ? 'trekking_pole' : 'etc'),
  },
  {
    code: '001010', // 쿡웨어
    cat: (n) => {
      if (/컵/.test(n)) return 'cup';
      if (/플라스크|서스테인|보틀|날진/.test(n)) return 'bottle';
      if (/수저/.test(n)) return 'cutlery';
      return 'cookware_etc';
    },
  },
  { code: '001014', cat: 'sunglasses' }, // 컬래버 선글라스
  {
    code: '001011', // GEAR ACC catch-all (다른 leaf와 대량 중복 — 새 아이템만 순증)
    cat: (n) => {
      if (/카라비너|온도계/.test(n)) return 'etc';
      if (/랜턴/.test(n)) return 'lighting';
      if (/코드슬링|폴\s*&\s*펙|V\s*펙/.test(n)) return 'tent_acc';
      if (/선글라스/.test(n)) return 'sunglasses';
      if (/판초|랩스커트/.test(n)) return 'clothing';
      if (/매트/.test(n)) return 'mat';
      if (/스터프색|토트백|플로깅백/.test(n)) return 'pouch';
      if (/체어/.test(n)) return 'chair';
      if (/트레킹폴/.test(n)) return 'trekking_pole';
      return 'etc';
    },
  },
  { code: '002011', cat: 'clothing' }, // 아우터
  { code: '002010', cat: 'clothing' }, // 상의
  { code: '002009', cat: 'clothing' }, // 하의
  // SHOES/모자/양말/기타 ACC는 33개 스키마에 전용 키가 없지만, rab.js·montbell.js 관례대로
  // 제외하지 않고 'etc'로 수집한다 (신발 'accessories-equipment/footwear': 'etc',
  // 양말/모자 '18'/'20': 'etc' 등 기존 어댑터 선례).
  { code: '005', cat: 'etc' }, // SHOES
  { code: '010001', cat: 'etc' }, // 모자
  { code: '010002', cat: 'etc' }, // 양말
  { code: '010003', cat: 'etc' }, // 악세사리 (다른 leaf와 중복 많음 — 새 아이템만 순증)
];

const resolveCategory = (catField, name) => (typeof catField === 'function' ? catField(name) : catField);

const slugify = (s) =>
  s
    .trim()
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .toLowerCase();

// 국내 전용 브랜드라 영문 제품명이 아예 없다 — `name`을 비워두지 않고 nameKorean을 표준 로마자
// 표기법(Revised Romanization)으로 음역해서 채운다 (SKILL.md "국내 전용 브랜드 name(영문)
// 채우기" 규칙). 한글이 아닌 문자(모델코드 UL/DAC, 숫자 등)는 그대로 둔다.
const RR_INITIALS = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const RR_MEDIALS = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
const RR_FINALS = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];
const romanizeSyllable = (code) => {
  const base = code - 0xac00;
  const initial = Math.floor(base / (21 * 28));
  const medial = Math.floor((base % (21 * 28)) / 28);
  const final = base % 28;
  return RR_INITIALS[initial] + RR_MEDIALS[medial] + RR_FINALS[final];
};
const romanize = (text) => {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0);
    out += code >= 0xac00 && code <= 0xd7a3 ? romanizeSyllable(code) : ch;
  }
  return out;
};
const capitalizeFirstLetter = (s) => {
  const idx = s.search(/[a-zA-Z]/);
  return idx === -1 ? s : s.slice(0, idx) + s[idx].toUpperCase() + s.slice(idx + 1);
};
const romanizeToken = (token) => (/[가-힣]/.test(token) ? capitalizeFirstLetter(romanize(token)) : token);
const romanizeName = (koreanText) =>
  koreanText
    .split(/(\s+)/)
    .map((t) => (/\s+/.test(t) ? t : romanizeToken(t)))
    .join('');

// 사이즈 단어가 상품명 끝에 붙는 관례(예: "타이벡 UL 매트 M", "라모나 에어썸 UL 400 LARGE")를
// 분리해 size/sizeKorean을 채우고, 사이즈를 뗀 base 이름으로 같은 라인의 색상/사이즈 변형을 묶는다.
const SIZE_WORD_RE = /\s+(스몰|미디엄|라지|엑스라지|SMALL|MEDIUM|LARGE|X-?LARGE|XS|XL|[SML])$/i;
const SIZE_MAP = {
  스몰: ['Small', '스몰'], small: ['Small', '스몰'], s: ['Small', '스몰'],
  미디엄: ['Medium', '미디엄'], medium: ['Medium', '미디엄'], m: ['Medium', '미디엄'],
  라지: ['Large', '라지'], large: ['Large', '라지'], l: ['Large', '라지'],
  엑스라지: ['X-Large', '엑스라지'], xl: ['X-Large', '엑스라지'],
};
const extractSize = (name) => {
  const m = name.match(SIZE_WORD_RE);
  if (!m) return { base: name, size: '', sizeKorean: '' };
  const token = m[1];
  const base = name.slice(0, m.index).trim();
  const mapped = SIZE_MAP[token.toLowerCase()];
  if (mapped) return { base, size: mapped[0], sizeKorean: mapped[1] };
  const norm = token.replace(/^x-?large$/i, 'X-Large');
  return { base, size: norm.length <= 3 ? norm.toUpperCase() : norm, sizeKorean: '' };
};

// 크롤에서 실제로 관측된 색상 단어를 모두 커버 (색상이 있으면 colorKorean도 반드시 채워야 하는
// 규칙 — SKILL.md 공통 필드 표 참고). 단어 단위 사전이라 조합("Stone Gray" 등)도 자동 처리된다.
const COLOR_KO = {
  BLACK: '블랙', WHITE: '화이트', GRAY: '그레이', GREY: '그레이', NAVY: '네이비', BLUE: '블루',
  GREEN: '그린', BROWN: '브라운', YELLOW: '옐로우', RED: '레드', ORANGE: '오렌지', BEIGE: '베이지',
  PINK: '핑크', PURPLE: '퍼플', OLIVE: '올리브', KHAKI: '카키', CHARCOAL: '차콜', SAND: '샌드',
  STONE: '스톤', SILVER: '실버', GOLD: '골드', MINT: '민트', CARBON: '카본', LIME: '라임',
  LIGHT: '라이트', DARK: '다크', GRAYISH: '그레이시', LAKE: '레이크', SPINACH: '스피니치',
  INDI: '인디', MELANGE: '멜란지', DEEP: '딥', SYMPHONIC: '심포닉', NIAGARA: '나이아가라',
  MIST: '미스트', SUNSET: '선셋', MUSTARD: '머스타드', OATMEAL: '오트밀', LAVENDER: '라벤더',
  WINE: '와인', SKYWAY: '스카이웨이', COLOR: '컬러', MIX: '믹스', IVORY: '아이보리', LILAC: '라일락',
};
// 사전에 없는 새 색상 단어(신규 컬러웨이 등)가 나왔을 때의 최후 폴백 — 정교한 영→한 음역은
// 아니지만 "color 있으면 colorKorean도 필수" 규칙 위반(빈 값)만은 피한다.
const EN_SOUND = {
  a: '아', b: '브', c: '크', d: '드', e: '에', f: '프', g: '그', h: '흐', i: '이', j: '지',
  k: '크', l: '을', m: '므', n: '느', o: '오', p: '프', q: '크', r: '르', s: '스', t: '트',
  u: '우', v: '브', w: '우', x: '스', y: '이', z: '즈',
};
const roughTransliterate = (word) => [...word.toLowerCase()].map((c) => EN_SOUND[c] ?? '').join('');
const colorToKorean = (colorEnglish, nameKorean) => {
  const words = colorEnglish.split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const mapped = words.map((w) => COLOR_KO[w.toUpperCase()]);
  if (mapped.every(Boolean)) return mapped.join(' '); // 사전으로 전부 커버되면 그대로 신뢰
  // 사전에 없는 단어가 섞였을 때만: 사이트가 컬렉션/컬러웨이명을 제품명 괄호 안에 공식 한글로
  // 적어둔 경우가 있어 그걸 우선 쓴다 (예: "오크리프 2P (나이아가라 미스트)"). 단, "(플러스)"
  // 처럼 색상과 무관한 제품명 접미사도 있어 "사전이 이미 다 커버" 케이스에서는 이 경로를 타지
  // 않도록 위에서 먼저 걸러낸다.
  const paren = (nameKorean || '').match(/\(([^)]+)\)\s*$/);
  if (paren && /[가-힣]/.test(paren[1])) return paren[1].trim();
  return words.map((w, i) => mapped[i] ?? roughTransliterate(w)).join(' ');
};
// colorOptionCode는 "BLACK#000000" / "STONEGRAY" 처럼 hex나 붙임표기가 섞여 있어 정리한다.
// "FREE"는 색상이 아니라 "단일 옵션"(사이즈의 One Size에 대응) 표기라 빈 색상으로 처리.
const cleanColorName = (optionVal) => {
  const v = (optionVal || '').replace(/#[0-9a-f]{3,6}$/i, '').replace(/_/g, ' ').trim();
  if (!v || /^free$/i.test(v)) return '';
  return v.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

const fetchListingPage = async (code, page, limit = 100) => {
  const res = await fetch(`${BASE}/api/category/${code}?limit=${limit}&page=${page}`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  if (!res.ok) return { items: [], total: 0 };
  const items = await res.json();
  const total = parseInt(res.headers.get('x-total-count') ?? '0', 10);
  return { items: Array.isArray(items) ? items : [], total };
};

const fetchAllListing = async (code) => {
  const limit = 100;
  const all = [];
  let page = 1;
  for (;;) {
    const { items, total } = await fetchListingPage(code, page, limit);
    all.push(...items);
    if (items.length === 0 || all.length >= total) break;
    page += 1;
  }
  return all;
};

// `PRELOAD_DATA = {...};` 안의 최상위 객체를 중괄호 균형으로 추출 (문자열 안 { } 는 무시).
const extractBalancedJson = (html, marker) => {
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const from = start + marker.length;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = from; i < html.length; i += 1) {
    const c = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return html.slice(from, i + 1);
    }
  }
  return null;
};

// 상세페이지의 설명 이미지 URL만 수집 (weight/specs는 이미지 안에 있어 OCR 후처리 필요 — 코베아 방식).
const fetchSpecImages = async (itemCode) => {
  try {
    const res = await fetch(`${BASE}/product/${itemCode}`, { headers: { 'User-Agent': UA } });
    const html = await res.text();
    const json = extractBalancedJson(html, 'PRELOAD_DATA = ');
    if (!json) return [];
    const prod = JSON.parse(json).product ?? {};
    // 색상별 설명 이미지는 product.colors(리스팅용 요약)가 아니라
    // product.itemOptions[].itemOptionVals[].detailDescPc/detailDescMobile 에 들어있다.
    const optionVals = (prod.itemOptions ?? []).flatMap((opt) => opt.itemOptionVals ?? []);
    const descHtmls = [
      prod.detailDescPc,
      prod.detailDescMobile,
      ...optionVals.flatMap((v) => [v.detailDescPc, v.detailDescMobile]),
    ].filter(Boolean);
    const imgs = new Set();
    for (const h of descHtmls) {
      for (const m of h.matchAll(/<img[^>]*src="([^"]+)"/g)) imgs.add(m[1].split('?')[0]);
    }
    return [...imgs];
  } catch {
    return [];
  }
};

const buildRows = (item, category, categoryUrl) => {
  const { base, size, sizeKorean } = extractSize(item.itemName);
  // name(영문)은 필수 — 국내 전용 브랜드라 원문 영문명이 없으므로 로마자 음역 + 사이즈 부착.
  const nameEnglish = romanizeName(base) + (size ? ` / ${size}` : '');
  const common = {
    groupId: `zerogram_${slugify(base)}`,
    category,
    company: 'zerogram',
    companyKorean: '제로그램',
    name: nameEnglish,
    nameKorean: item.itemName,
    size,
    sizeKorean,
    weight: 0,
    specs: {},
    // push.js는 같은 _source의 첫 항목 카테고리를 그룹 전체에 덮어쓴다(비대화형 모드).
    // 한 leaf 카테고리 URL에 여러 내부 카테고리가 섞여 있어(쿡웨어/체어·스틱/가방/타프·쉘터/
    // GEAR ACC catch-all) URL만으로는 1:1이 아니므로 카테고리를 프래그먼트로 붙여 맞춘다.
    _source: `${categoryUrl}#${category}`,
    // 상품 개별 상세페이지 URL (필수 필드 — 카테고리 리스팅 URL인 _source와 다른 용도).
    _detailUrl: `${BASE}/product/${item.itemCode}`,
    _itemCode: item.itemCode,
  };
  if (!item.colors || item.colors.length === 0) {
    return [
      {
        ...common,
        color: '',
        colorKorean: '',
        imageUrl: item.itemImg ? IMG_BASE + item.itemImg : '',
      },
    ];
  }
  return item.colors.map((c) => {
    let colorEnglish = cleanColorName(c.optionVal);
    // 일부 상품(예: 윌도 폴딩 컵 S/L)은 "색상" 옵션축이 실은 사이즈코드를 그대로 담고 있다 —
    // 이미 size로 뽑아둔 값과 겹치는 단독 알파벳이면 진짜 색상이 아니므로 비운다.
    if (/^[A-Z]{1,2}$/.test(colorEnglish) && size && size.toUpperCase().startsWith(colorEnglish)) {
      colorEnglish = '';
    }
    return {
      ...common,
      color: colorEnglish,
      colorKorean: colorEnglish ? colorToKorean(colorEnglish, item.itemName) : '',
      imageUrl: (c.repImg || item.itemImg) ? IMG_BASE + (c.repImg || item.itemImg) : '',
    };
  });
};

const crawlLeaf = async (leaf, seen, { withWeight }) => {
  const categoryUrl = `${BASE}/category/${leaf.code}`;
  const items = await fetchAllListing(leaf.code);
  const rows = [];
  let fresh = 0;
  for (const item of items) {
    if (seen.has(item.itemCode)) continue;
    seen.add(item.itemCode);
    fresh += 1;
    const category = resolveCategory(leaf.cat, item.itemName);
    const itemRows = buildRows(item, category, categoryUrl);
    if (withWeight) {
      const specImages = await fetchSpecImages(item.itemCode);
      for (const r of itemRows) r._specImages = specImages;
    }
    rows.push(...itemRows);
  }
  console.log(`[zerogram]   ${leaf.code}: ${items.length} listing items, +${fresh} new (${rows.length} rows)`);
  return rows;
};

export default {
  name: 'zerogram',
  company: 'zerogram',
  baseUrl: BASE,
  defaultCategories: LEAF_CATEGORIES.map((l) => l.code),
  crawl: async (browser, { categoryUrls, withWeight = true } = {}) => {
    const codes = categoryUrls?.length ? categoryUrls : LEAF_CATEGORIES.map((l) => l.code);
    const seen = new Set();
    const all = [];
    for (const code of codes) {
      const bare = String(code).replace(`${BASE}/category/`, '');
      const leaf = LEAF_CATEGORIES.find((l) => l.code === bare);
      if (!leaf) {
        console.log(`[zerogram] unknown category code: ${code} — skipping`);
        continue;
      }
      console.log(`[zerogram] crawling ${leaf.code}`);
      try {
        const rows = await crawlLeaf(leaf, seen, { withWeight });
        all.push(...rows);
      } catch (e) {
        console.log(`[zerogram] error on ${leaf.code}: ${e.message} — skipping`);
      }
    }
    return all;
  },
};

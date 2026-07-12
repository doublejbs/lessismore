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
];
// SHOES(005), 모자/양말/기타 ACC(010)는 33개 카테고리 스키마에 대응 키가 없어 크롤 대상에서 제외.

const resolveCategory = (catField, name) => (typeof catField === 'function' ? catField(name) : catField);

const slugify = (s) =>
  s
    .trim()
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .toLowerCase();

// 사이즈 단어가 상품명 끝에 붙는 관례(예: "타이벡 UL 매트 M", "라모나 에어썸 UL 400 LARGE")를
// 분리해 size/sizeKorean을 채우고, 사이즈를 뗀 base 이름으로 같은 라인의 색상/사이즈 변형을 묶는다.
const SIZE_WORD_RE = /\s+(스몰|미디엄|라지|엑스라지|SMALL|MEDIUM|LARGE|X-?LARGE|XS|XL|[SML])$/i;
const SIZE_MAP = {
  스몰: ['Small', '스몰'], small: ['Small', '스몰'],
  미디엄: ['Medium', '미디엄'], medium: ['Medium', '미디엄'],
  라지: ['Large', '라지'], large: ['Large', '라지'],
  엑스라지: ['X-Large', '엑스라지'],
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

const COLOR_KO = {
  BLACK: '블랙', WHITE: '화이트', GRAY: '그레이', GREY: '그레이', NAVY: '네이비', BLUE: '블루',
  GREEN: '그린', BROWN: '브라운', YELLOW: '옐로우', RED: '레드', ORANGE: '오렌지', BEIGE: '베이지',
  PINK: '핑크', PURPLE: '퍼플', OLIVE: '올리브', KHAKI: '카키', CHARCOAL: '차콜', SAND: '샌드',
  STONE: '스톤', SILVER: '실버', GOLD: '골드', MINT: '민트', CARBON: '카본', LIME: '라임',
};
const colorToKorean = (colorEnglish) => {
  const words = colorEnglish.split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const ko = words.map((w) => COLOR_KO[w.toUpperCase()]).filter(Boolean);
  return ko.length === words.length ? ko.join(' ') : '';
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
  const common = {
    groupId: `zerogram_${slugify(base)}`,
    category,
    company: 'zerogram',
    companyKorean: '제로그램',
    name: '',
    nameKorean: item.itemName,
    size,
    sizeKorean,
    weight: 0,
    specs: {},
    _source: categoryUrl,
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
    const colorEnglish = cleanColorName(c.optionVal);
    return {
      ...common,
      color: colorEnglish,
      colorKorean: colorToKorean(colorEnglish),
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

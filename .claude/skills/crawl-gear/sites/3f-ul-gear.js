// 3F UL Gear — 3fulgear.com, WooCommerce. 공개 Store REST API(`/wp-json/wc/store/v1/`)가 카테고리·
// 상품·변형·이미지·가격을 전부 구조화 JSON으로 준다 — puppeteer 불필요, fetch만으로 크롤.
// 스펙(무게/소재/치수)은 API 필드(`weight`/`dimensions`)가 늘 빈값이라(이 사이트가 안 채움) 상품
// `description` HTML 안의 "SPECS"/"BASICS"/"Specifications" 섹션 텍스트에서 라벨:값을 정규식으로
// 뽑는다. 무게 라벨이 상품군마다 다르다(TRAIL WEIGHT/MINIMUM WEIGHT/PACKED WEIGHT/WEIGHT) —
// 우선순위 리스트로 첫 매치를 채택.
// 변형(색상/사이즈)별 API의 weight/dimensions도 항상 빈값 → 부모 description에서 뽑은 대표 무게를
// 전 변형에 적용하되, "M-size: 650g / L-size: 677g" 처럼 사이즈별 값이 명시된 경우 그 변형에 한해
// 사이즈별 값으로 override.
// 카테고리 자체가 섞여있다(예: ultralight-tent 안에 풋프린트 액세서리, accessories 안에 텐트폴/
// 스토브 등) — 이름 키워드로 재분류.
// 한글 공식 유통처 없음(마켓플레이스 재판매만, 검색 확인) → nameKorean은 어휘 사전 기반 부분
// 음역(zpacks 세션에서 확립한 패턴과 동일). 미등재어는 원문 유지.
const BASE = 'https://3fulgear.com';
const API = `${BASE}/wp-json/wc/store/v1`;
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const fetchJson = async (url) => {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};

// ── HTML → 텍스트 (엔티티 unescape 필수 — 안 하면 &#8243;(") 같은 표기가 정규식에 안 맞음) ──
const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  '8211': '-', '8212': '-', '8216': "'", '8217': "'", '8220': '"', '8221': '"', '8243': '"', '8242': "'",
};
const unescapeHtml = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => ENTITIES[n] ?? String.fromCharCode(parseInt(n, 10)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, n) => ENTITIES[n]);
const htmlToText = (html) =>
  unescapeHtml((html || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// ── 카테고리 매핑 + 재분류 ──────────────────────────────────────────────
const CATEGORY_MAP = {
  packs: 'backpack',
  'freestanding-tent': 'tent',
  'ultralight-tent': 'tent',
  tarps: 'tarp',
  stoves: 'stove',
  'rain-gear': 'clothing',
  accessories: 'etc',
  'repair-parts': 'tent_acc',
};

// 사이트에 실제 판매 상품이 아닌 서비스/수수료/위생용품이 섞여있어 크롤 대상에서 제외.
const EXCLUDE_RE = /shipping cost|customi[sz]ed (products|shipping)|seam sealing service|personal hygiene/i;

const classify = (catSlug, name) => {
  const n = name.toLowerCase();
  if (/trekking pole/.test(n)) return 'trekking_pole';
  if (/footprint|ground ?sheet|tent sack|pole clip|pole repair|repair sleeve|vestibule hook|buckle|stakes|guy ?line|cord|clips? for|tent pole|separate tent fly/.test(n))
    return 'tent_acc';
  if (/pack cover/.test(n)) return 'backpack_cover';
  if (/gaiter/.test(n)) return 'gaiter';
  if (/rain (jacket|pants|poncho|kilt)/.test(n)) return 'clothing';
  if (/dry sack|insulated bag|bottle sleeve/.test(n)) return 'pouch';
  if (/stove|cooking (system|kit)/.test(n)) return 'stove';
  if (/backpack|daypack/.test(n)) return 'backpack';
  if (/\btarp\b/.test(n)) return 'tarp';
  if (/hot tent|\btent\b/.test(n)) return 'tent';
  return CATEGORY_MAP[catSlug] ?? 'etc';
};

// ── 무게 추출: 상품군마다 라벨이 달라 우선순위 리스트로 첫 매치 채택 ──────────────
const WEIGHT_LABEL_RES = [
  /TRAIL WEIGHT\D{0,12}?([\d.]+)\s*(kg|g)\b/i,
  /PACKED WEIGHT\D{0,12}?([\d.]+)\s*(kg|g)\b/i,
  /MINIMUM WEIGHT\D{0,12}?([\d.]+)\s*(kg|g)\b/i,
  /TOTAL WEIGHT\D{0,12}?([\d.]+)\s*(kg|g)\b/i,
  /\bWEIGHT\D{0,12}?([\d.]+)\s*(kg|g)\b/i,
];
const toGrams = (num, unit) => (unit.toLowerCase() === 'kg' ? Math.round(parseFloat(num) * 1000) : Math.round(parseFloat(num)));

const findWeightG = (text) => {
  for (const re of WEIGHT_LABEL_RES) {
    const m = text.match(re);
    if (m) return toGrams(m[1], m[2]);
  }
  return 0;
};

// "M-size: 650 g" / "L-size: 677 g" 처럼 사이즈별 무게가 명시된 경우 그 사이즈에 한해 override.
const findSizeWeightG = (text, sizeLabel) => {
  if (!sizeLabel) return 0;
  const esc = sizeLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${esc}[-\\s]size\\D{0,10}?([\\d.]+)\\s*(kg|g)\\b`, 'i');
  const m = text.match(re);
  return m ? toGrams(m[1], m[2]) : 0;
};

// "Stakes+sack-100g, Guyline-11g, Footprint(option)-100g" 처럼 ACC WEIGHT 섹션에 부속품별
// 무게가 따로 있으면 키워드로 찾는다(예: keyword="footprint").
const findAccessoryWeightG = (text, keyword) => {
  const re = new RegExp(`${keyword}[^,]{0,25}?-\\s*([\\d.]+)\\s*(kg|g)\\b`, 'i');
  const m = text.match(re);
  return m ? toGrams(m[1], m[2]) : 0;
};

// ── 변형 옵션 파싱 ───────────────────────────────────────────────────
// 이 브랜드는 "색상" 축을 대부분 "OPTION"이라 이름 붙여(Color로 안 잡힘) 시즌·소재까지
// 한 값에 압축해 넣는다("Khaki - 3 season", "Forest Green(2026 ver) - 3 season") — 게다가
// 같은 축 안에 완전히 다른 부속품(Footprint/Dual-Pole Clips 등)이 "옵션"으로 섞여 있다
// (Beetle16 2.0의 OPTION 축도 동일 패턴: MAIN TENT KIT/EXTEND PART/FOOTPRINT 등).
// 축 이름이 아니라 "값 자체"로 판별한다.
const ACCESSORY_VALUE_RE =
  /footprint|pole clip|extra pole|dual-pole|extend part|inner tent for|tpu transparent|separate tent|^tarp$|clips? &|main tent kit/i;
const COLOR_WORDS = [
  'forest green', 'metal grey', 'metal gray', 'dark grey', 'dark gray', 'grey white', 'gray white',
  'green', 'grey', 'gray', 'khaki', 'orange', 'black', 'white', 'red', 'blue', 'navy', 'tan',
  'sand', 'olive', 'silver', 'yellow', 'camo',
];
const extractColor = (val) => {
  const low = val.toLowerCase();
  const hit = COLOR_WORDS.find((c) => low.includes(c));
  return hit || '';
};
const extractSeason = (val) => {
  const m = val.match(/(\d)[- ]season/i);
  return m ? `${m[1]} Season` : '';
};
// 값에서 색상어·시즌 표기를 걷어낸 나머지(소재코드·버전 표기 등)만 남긴다.
const stripColorSeason = (val, color) => {
  let out = val;
  if (color) out = out.replace(new RegExp(color, 'i'), '');
  out = out.replace(/\d[- ]season/i, '');
  return out.replace(/[-()]/g, ' ').replace(/\s+/g, ' ').trim();
};

// ── 스펙 추출 (라벨:값, SPECS 섹션 텍스트에서) ─────────────────────────────
// 값 뒤에서 "다음 라벨"의 시작을 찾을 때 대문자 2글자(예: "PU"·"UV" 같은 값 안의 약어)만
// 보고 멈추면 값이 잘린다("15D Nylon with PU coating"→"PU"에서 끊김) — 이 사이트의 실제
// 라벨은 항상 대문자 단어가 "연속 2개 이상"이라(FLY MATERIALS/INNER MATERIALS 등) 그 패턴만
// 다음 라벨 경계로 인정한다.
const NEXT_LABEL_LOOKAHEAD = /\s+[A-Z]{2,}(?:\s+[A-Z]{2,})+/;
const findLabelValue = (text, labelRe) => {
  const m = text.match(labelRe);
  if (!m) return '';
  const tail = text.slice(m.index + m[0].length, m.index + m[0].length + 200);
  const val = tail.match(new RegExp(`^\\s*(.{1,150}?)(?=${NEXT_LABEL_LOOKAHEAD.source}|$)`));
  return val ? val[1].trim().replace(/\s{2,}/g, ' ') : '';
};

const findCapacity = (text) => {
  const m = text.match(/CAPACITY\s+(\d+(?:-\d+)?)\s*Person/i) || text.match(/(\d+)\s*Person\b/i);
  return m ? parseInt(m[1], 10) : 0;
};

const buildTentSpecs = (text) => ({
  capacity: findCapacity(text),
  wallStructure: /double\s*wall/i.test(text) ? '더블월' : /single\s*wall/i.test(text) ? '싱글월' : '',
  shape: '',
  innerMaterial: findLabelValue(text, /INNER MATERIALS?/i),
  flyMaterial: findLabelValue(text, /FLY MATERIALS?/i),
  poleMaterial: findLabelValue(text, /POLE MATERIALS?/i),
  waterproofRating: (text.match(/waterproof\s*(\d{3,5})\s*mm/i) || [])[1] || '',
  pitchType: /trekking\s*pole tent/i.test(text) ? '비자립형' : /freestanding/i.test(text) ? '자립형' : '',
  vestibuleArea: 0,
});

// ── 한글 음역 (공식 유통 없음 → 어휘 사전 기반 부분 음역, zpacks 세션 패턴) ──────────
const MODEL_KOR = {
  lanshan: '란샨', tutor: '튜터', beetle: '비틀', qingkong: '칭콩', qidian: '치디안',
  taiji: '타이지', taihang: '타이항', tianshan: '톈산', yue: '위에', koala: '코알라',
  conch: '콘치', reflection: '리플렉션', tribe: '트라이브', chief: '치프', shell: '쉘',
};
// 색상은 다른 사전과 합쳐 단어 단위로 조합(예: "Forest Green"→포레스트 그린, "Grey white"→
// 그레이 화이트) — transliterate()가 단어별로 순회하므로 구(phrase) 단위 사전은 안 먹는다.
const COLOR_WORD_KOR = {
  black: '블랙', white: '화이트', gray: '그레이', grey: '그레이', green: '그린', khaki: '카키',
  tan: '탄', sand: '샌드', orange: '오렌지', red: '레드', blue: '블루', navy: '네이비',
  yellow: '옐로', olive: '올리브', silver: '실버', camo: '카모', forest: '포레스트', dark: '다크',
};
const WORD_KOR = {
  tent: '텐트', backpack: '백팩', daypack: '데이팩', pack: '팩', ultra: '울트라', pro: '프로',
  footprint: '풋프린트', ground: '그라운드', sheet: '시트', sack: '색', pole: '폴', poles: '폴',
  stove: '스토브', cooking: '쿠킹', system: '시스템', kit: '키트', jacket: '자켓', pants: '팬츠',
  poncho: '판초', kilt: '킬트', gaiters: '게이터', umbrella: '우산', cover: '커버', dry: '드라이',
  compression: '컴프레션', bag: '백', bivy: '비비', cord: '코드', stakes: '스테이크', clips: '클립',
  clip: '클립', buckle: '버클', hooks: '훅', hook: '훅', sleeve: '슬리브', repair: '리페어',
  aftersale: '애프터세일', carbon: '카본', fiber: '파이버', titanium: '티타늄', aluminium: '알루미늄',
  aluminum: '알루미늄', trekking: '트레킹', wind: '윈드', wood: '우드', folding: '폴딩',
  chimney: '체임니', floating: '플로팅', cloud: '클라우드', hot: '핫', max: '맥스', mini: '미니',
  version: '버전', ver: '버전', classic: '클래식', season: '시즌', rain: '레인', trail: '트레일',
  ultralight: '울트라라이트', minimalist: '미니멀리스트', dual: '듀얼', insulated: '인슐레이티드',
  water: '워터', bottle: '보틀', for: '', the: '', with: '', service: '서비스', sealing: '실링',
  xs: '엑스스몰', s: '스몰', m: '미디엄', l: '라지', xl: '엑스라지', xxl: '더블엑스라지',
  small: '스몰', medium: '미디엄', large: '라지', regular: '레귤러', tarp: '타프',
  lightweight: '라이트웨이트', silicone: '실리콘', sealant: '실런트', luminous: '루미너스',
  sticker: '스티커', clips: '클립',
};
// 모델명에 숫자가 붙어있으면("Shell2"·"Beetle16") 사전 키(shell/beetle)와 안 맞아 그대로 원문이
// 남는다(실측: nameKorean에 한글이 0글자인 행 20개) — 사전 조회 전에 끝의 숫자를 분리한다.
const splitTrailingDigits = (w) => {
  const m = w.match(/^([a-zA-Z]+)(\d+)$/);
  return m ? [m[1], m[2]] : [w];
};
const transliterate = (name) => {
  const words = name.replace(/&#8482;/g, '').split(/\s+/);
  return words
    .flatMap((w) => splitTrailingDigits(w.replace(/[™®]/g, '')))
    .map((bare) => {
      const low = bare.toLowerCase().replace(/[().,]/g, '');
      if (MODEL_KOR[low]) return MODEL_KOR[low];
      if (COLOR_WORD_KOR[low]) return COLOR_WORD_KOR[low];
      if (WORD_KOR[low] !== undefined) return WORD_KOR[low];
      if (/^\d+(\.\d+)?[a-zA-Z"']*$/.test(bare)) return bare; // 숫자/단위(35L, 16, 2.0 등) 유지
      return bare;
    })
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const slugify = (s) => s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

// ── 크롤 ──────────────────────────────────────────────────────────
const fetchCategoryProducts = async (catSlug) => {
  const items = await fetchJson(`${API}/products?category=${catSlug}&per_page=100`);
  return items.filter((p) => !EXCLUDE_RE.test(p.name));
};

const fetchVariationDetail = (id) => fetchJson(`${API}/products/${id}`);

const buildRowsForProduct = async (product, catSlug) => {
  const category = classify(catSlug, product.name);
  const descText = htmlToText(product.description) + ' ' + htmlToText(product.short_description);
  const baseWeightG = findWeightG(descText);
  const specs = ['tent', 'shelter', 'tarp'].includes(category) ? buildTentSpecs(descText) : {};
  const nameKorean = transliterate(product.name);

  // push.js는 _source 로 묶어 그 안의 전 행을 하나의 카테고리로 강제 덮어쓴다(대화형/
  // 비대화형 둘 다 items[0].category 를 기본값으로 사용). 이 브랜드는 한 리스팅 페이지
  // 안에 카테고리가 섞여있다(예: freestanding-tent 안에 진짜 텐트 + 풋프린트/폴클립 액세서리
  // 재분류행) — _source 를 그대로 두면 섞인 행 전부가 하나의 카테고리로 뭉개진다. 카테고리를
  // _source 에 포함시켜 push.js 그룹이 항상 단일 카테고리가 되게 한다.
  const sourceFor = (cat) => `${BASE}/product-category/${catSlug}/#${cat}`;

  const rowBase = {
    groupId: `3f-ul-gear_${slugify(product.name)}`,
    category,
    company: '3f-ul-gear',
    companyKorean: '쓰리에프 UL기어',
    nameKorean,
    _source: sourceFor(category),
    _detailUrl: product.permalink,
    specs,
  };

  if (product.type !== 'variable' || !product.variations?.length) {
    return [
      {
        ...rowBase,
        name: product.name,
        color: '',
        colorKorean: '',
        size: '',
        sizeKorean: '',
        weight: baseWeightG,
        imageUrl: product.images?.[0]?.src || '',
      },
    ];
  }

  const rows = [];
  for (const v of product.variations) {
    let detail;
    try {
      detail = await fetchVariationDetail(v.id);
    } catch {
      continue;
    }
    const allVals = v.attributes.map((a) => a.value).filter(Boolean);
    const bundleVal = allVals.find((val) => ACCESSORY_VALUE_RE.test(val));
    const image = detail.images?.[0]?.src || product.images?.[0]?.src || '';

    if (bundleVal) {
      // 이 "옵션"은 같은 색상/사이즈 변형이 아니라 완전히 다른 부속품(풋프린트/폴클립 등)이
      // 끼워 팔리는 경우 — 본품(텐트) 무게를 그대로 물려주면 틀린 값이 된다. 카테고리를
      // tent_acc로 바꾸고, ACC WEIGHT 섹션에서 그 부속품 전용 무게를 따로 찾는다(없으면 0).
      // 색상축(예: Khaki/Black)은 여전히 유효한 구분값이라 지우면 안 된다(안 지우면 색상별로
      // 이름만 같은 "중복행"처럼 보임 — Beetle16 2.0에서 실측).
      const keyword = bundleVal.split(/[\s(]/)[0];
      const bundleColor = allVals.map(extractColor).find(Boolean) || '';
      rows.push({
        ...rowBase,
        category: 'tent_acc',
        _source: sourceFor('tent_acc'),
        specs: { material: '', size: '' },
        name: bundleColor ? `${product.name} - ${bundleVal} / ${bundleColor}` : `${product.name} - ${bundleVal}`,
        color: bundleColor ? bundleColor.replace(/\b\w/g, (c) => c.toUpperCase()) : '',
        colorKorean: bundleColor ? transliterate(bundleColor) : '',
        size: bundleVal,
        sizeKorean: transliterate(bundleVal),
        weight: findAccessoryWeightG(descText, keyword),
        imageUrl: image,
      });
      continue;
    }

    const colorVal = allVals.map(extractColor).find(Boolean) || '';
    const seasonVal = allVals.map(extractSeason).find(Boolean) || '';
    const restVals = allVals.map((val) => stripColorSeason(val, colorVal)).filter(Boolean);
    const sizeParts = [seasonVal, ...restVals].filter(Boolean);
    const sizeVal = [...new Set(sizeParts)].join(' / ');
    const sizeSpecificG = allVals.map((sv) => findSizeWeightG(descText, sv)).find(Boolean) || 0;

    rows.push({
      ...rowBase,
      name: sizeVal ? `${product.name} / ${sizeVal}` : product.name,
      color: colorVal ? colorVal.replace(/\b\w/g, (c) => c.toUpperCase()) : '',
      colorKorean: colorVal ? transliterate(colorVal) : '',
      size: sizeVal,
      sizeKorean: sizeVal ? transliterate(sizeVal) : '',
      weight: sizeSpecificG || baseWeightG,
      imageUrl: image,
    });
  }
  return rows.length ? rows : [];
};

export default {
  name: '3f-ul-gear',
  company: '3f-ul-gear',
  companyKorean: '쓰리에프 UL기어',
  baseUrl: BASE,
  defaultCategories: Object.keys(CATEGORY_MAP),
  crawl: async (browser, { categoryUrls } = {}) => {
    const cats = categoryUrls?.length ? categoryUrls : Object.keys(CATEGORY_MAP);
    const seenIds = new Set();
    const all = [];
    for (const catSlug of cats) {
      console.log(`[3f-ul-gear] crawling ${catSlug}`);
      const products = await fetchCategoryProducts(catSlug);
      let i = 0;
      for (const p of products) {
        i += 1;
        if (seenIds.has(p.id)) continue; // 카테고리 간 중복 상품 스킵
        seenIds.add(p.id);
        try {
          const detail = await fetchJson(`${API}/products/${p.id}`);
          const rows = await buildRowsForProduct(detail, catSlug);
          all.push(...rows);
        } catch (e) {
          console.log(`[3f-ul-gear]   error on ${p.name}: ${e.message} — skipping`);
        }
        if (i % 10 === 0) console.log(`[3f-ul-gear]   ${i}/${products.length}`);
      }
    }
    return all;
  },
};

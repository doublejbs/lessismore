// SOTO(소토) — sotooutdoors.com, WordPress + WooCommerce. 전부 서버렌더 → puppeteer 불필요,
// plain fetch로 충분(단 ModSecurity가 헤더 없는 요청을 차단하므로 UA/Accept 헤더 필수).
// 리스팅: /product-category/<slug>/ (페이지네이션은 .woocommerce-pagination a.next 있으면
//   /page/N/ 추가). all-products/latest-and-popular는 stoves/cookware/accessories/parts와
//   상품이 겹치는 재노출 카테고리라 제외.
// 상세: 표준 WooCommerce "Additional information" 표에 Weight(oz)/Dimensions(in)가 깔끔한
//   텍스트로 있음 — OCR 불필요. oz→g 환산(×28.3495), lb 단위도 방어적으로 처리.
// 이 브랜드는 색상/사이즈가 있는 상품이 거의 없고(사이즈별로 아예 별도 상품 URL을 씀 —
// Titanium Pot 750ml/1100ml처럼), variation select을 쓰는 상품은 확인 범위 안에서 없었다.
//
// nameKorean 확보: 사이트가 100% 영문(한글 텍스트가 전무)이라 공식 한글명을 그대로 가져올
// 수가 없다. 우선순위: (1) 국내 리셀러 오캠프(ocamp.co.kr, Cafe24)의 카탈로그에서 확인한
// 확실한 매칭은 그 공식 한글명을 verbatim 사용, (2) 나머지는 흔한 캠핑/아웃도어 용어 사전으로
// 단어 단위 음역 + 사전에 없는 고유명사는 음절 단위 근사 표기(black-diamond.js의
// EN_TO_KO_SOUND/syllabicKorean 패턴 재사용)로 채운다. 모델코드/숫자 섞인 토큰(OD-1R, 4Flex
// 등)은 국내 판매 관례상 로마자 그대로 두는 게 자연스러워 번역하지 않는다.
const BASE = 'https://sotooutdoors.com';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const CATEGORY_MAP = {
  stoves: 'stove',
  cookware: null, // 품목별로 다름 — classifyCookware()에서 이름 보고 판별
  accessories: null, // 품목별로 다름
  parts: 'etc',
};

const classifyCookware = (name) => {
  if (/mug|cup\b/i.test(name)) return 'cup';
  return 'cookware_etc';
};
const classifyAccessory = (name) => {
  if (/torch/i.test(name)) return 'torch';
  if (/spork|spoon|fork|cutlery/i.test(name)) return 'cutlery';
  if (/coffee|hopper|dripper/i.test(name)) return 'cookware_etc';
  return 'etc';
};

const catOf = (categorySlug, name) => {
  if (categorySlug === 'cookware') return classifyCookware(name);
  if (categorySlug === 'accessories') return classifyAccessory(name);
  return CATEGORY_MAP[categorySlug] ?? 'etc';
};

const fetchHtml = async (url) => {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  return res.text();
};

const unescapeHtml = (s) =>
  s
    .replace(/&#215;|&times;/g, '×')
    .replace(/&#38;|&amp;/g, '&')
    .replace(/&#8217;/g, "'")
    .replace(/&nbsp;/g, ' ');

const slugify = (s) =>
  s
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}()-]/gu, '')
    .toLowerCase();

// ── 영문 상품명 → 한글 음역 ──────────────────────────────────────────────
// 오캠프(국내 SOTO 리셀러) 카탈로그에서 확인한 확실한 매칭. "windmaster" 같은 부분 문자열로
// 매칭하면 "Igniter Repair Kit for WindMaster Stove"처럼 그 라인을 "언급만" 하는 액세서리
// 상품까지 스토브 본품 이름으로 뭉개져버린다 — 반드시 정확한 상품명 전체 일치만 허용한다.
const KR_CONFIRMED = new Map([
  ['windmaster stove with 4flex', '윈드마스터 스토브'],
  ['amicus stove with igniter', '아미쿠스 스토브'],
  ['amicus stove without igniter', '아미쿠스 스토브'],
  ['fusion trek stove with advanced micro regulator technology', '레귤레이터스토브 FUSION'],
  ['tritrail stove', '레귤레이터 스토브 TRITRAIL'],
  ['navigator camping cookware set', '네비게이터쿡시스템'],
  ['thermostack cook set, original multi-functional camping cookware pot', '써모스택'],
  ['thermostack cook set combo', '써모스택'],
]);

// black-diamond.js의 EN_TO_KO_SOUND/syllabicKorean과 동일한 음절 근사 표기 폴백.
const EN_TO_KO_SOUND = {
  a: '아', b: '브', c: '크', d: '드', e: '이', f: '프', g: '그', h: '흐', i: '이', j: '지',
  k: '크', l: '을', m: '므', n: '느', o: '오', p: '프', q: '크', r: '르', s: '스', t: '트',
  u: '우', v: '브', w: '우', x: '스', y: '이', z: '즈',
};
const VOWELS = new Set('aeiouy');
const syllabicKorean = (word) => {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return '';
  const chunks = [];
  let cur = '';
  for (const ch of w) {
    cur += ch;
    if (VOWELS.has(ch)) {
      chunks.push(cur);
      cur = '';
    }
  }
  if (cur) (chunks.length ? (chunks[chunks.length - 1] += cur) : chunks.push(cur));
  return chunks.map((c) => [...c].map((ch) => EN_TO_KO_SOUND[ch] ?? '').join('')).join('');
};

// 캠핑/쿠킹 용품 흔한 단어 사전 — 국내 아웃도어 유통에서 통용되는 표기 위주.
const WORD_KO = {
  titanium: '티타늄', stove: '스토브', pot: '팟', cup: '컵', mug: '머그', bottle: '보틀',
  bowl: '보울', cookware: '쿡웨어', cook: '쿡', set: '세트', combo: '콤보', torch: '토치',
  lighter: '라이터', igniter: '이그나이터', adapter: '어댑터', regulator: '레귤레이터',
  micro: '마이크로', wide: '와이드', mouth: '마우스', trek: '트렉', trail: '트레일',
  field: '필드', table: '테이블', lantern: '랜턴', mantle: '맨틀', mantles: '맨틀', coffee: '커피',
  dripper: '드리퍼', hopper: '호퍼', spork: '스포크', cutlery: '커트러리', fuel: '퓨얼',
  gas: '가스', canister: '캐니스터', windscreen: '윈드스크린', wind: '윈드', water: '워터',
  ultra: '울트라', light: '라이트', lite: '라이트', compact: '컴팩트', double: '더블', wall: '월',
  duo: '듀오', glass: '글라스', globe: '글로브', cozy: '코지', support: '서포트',
  extended: '익스텐디드', refillable: '리필러블', gravity: '그래비티', lifter: '리프터',
  generator: '제너레이터', unit: '유닛', cap: '캡', seal: '씰', rings: '링', ring: '링',
  repair: '리페어', kit: '키트', handle: '핸들', river: '리버', new: '뉴', pocket: '포켓',
  mini: '미니', aero: '에어로', pump: '펌프', storm: '스톰', breaker: '브레이커',
  toaster: '토스터', mesh: '메시', bag: '백', case: '케이스', stand: '스탠드', grill: '그릴',
  plate: '플레이트', pan: '팬', skillet: '스킬렛', tongs: '통스', tong: '통', knife: '나이프',
  spoon: '스푼', fork: '포크', sieve: '시브', strainer: '스트레이너', lid: '리드',
  valve: '밸브', hose: '호스', connector: '커넥터', splitter: '스플리터', divider: '디바이더',
  tripod: '트라이포드', base: '베이스', folding: '폴딩', portable: '포터블', camping: '캠핑',
  outdoor: '아웃도어', with: '', without: '', and: '앤드', for: '용', of: '', original: '오리지널',
  multi: '멀티', functional: '펑셔널', advanced: '어드밴스드', technology: '테크놀로지',
  system: '시스템', stack: '스택',
  // 복합어/고유명사 구성요소 — camelCase 분리(splitCamel) 후 이 사전으로 조합.
  tri: '트라이', flex: '플렉스', master: '마스터', thermo: '써모', navi: '네비', muka: '무카',
  butane: '부탄', fill: '필', hanger: '행어', lightweight: '라이트웨이트', ultralight: '울트라라이트',
  amicus: '아미쿠스', helix: '헬릭스', maker: '메이커', the: '',
};

// 국제 단위 표기는 발음 표기보다 그대로 두는 게 자연스럽다(ml, oz, kg 등은 국내에서도 그대로 씀).
const UNIT_PASSTHROUGH = new Set(['ml', 'l', 'g', 'kg', 'oz', 'lb', 'lbs', 'mm', 'cm', 'in']);

const stripPunct = (w) => w.replace(/^[^\w#]+|[^\w#]+$/g, '');
const isCode = (w) => /\d/.test(w) && /^[A-Za-z0-9#-]+$/.test(w);
// 모두 대문자인 약어/브랜드명(XT, SOTO 등)은 음절 단위로 쪼개면 오히려 못 알아보게 되므로
// 로마자 그대로 둔다(국내 판매 페이지도 이런 짧은 약어는 보통 영문 그대로 표기).
const isAcronym = (w) => /^[A-Z]{2,}$/.test(w);

// "ThermoLite"/"MicroRegulator"처럼 사전에 없는 카멜케이스 합성 고유명사를 구성 단어로 쪼갠다.
// 대문자 연속(약어, 예: "XT")은 한 덩어리로 유지.
const splitCamel = (w) => w.match(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])/g) ?? [w];

const lookupWord = (w) => {
  const lower = w.toLowerCase();
  if (WORD_KO[lower] !== undefined) return WORD_KO[lower];
  if (lower.endsWith('s') && WORD_KO[lower.slice(0, -1)] !== undefined) return WORD_KO[lower.slice(0, -1)];
  return syllabicKorean(w);
};

const translateToken = (raw) => {
  const w = stripPunct(raw);
  if (!w) return '';
  if (isCode(w)) return w; // 모델코드/숫자 섞인 토큰은 로마자 그대로(국내 표기 관례)
  if (isAcronym(w)) return w;
  const lower = w.toLowerCase();
  if (UNIT_PASSTHROUGH.has(lower)) return w;
  if (WORD_KO[lower] !== undefined) return WORD_KO[lower];
  const parts = splitCamel(w);
  if (parts.length > 1) return parts.map(lookupWord).join('');
  if (/^[A-Za-z]+$/.test(w)) return lookupWord(w);
  return w;
};

const transliterateName = (nameEnglish) =>
  nameEnglish
    .split(/\s+/)
    .map(translateToken)
    .filter((t) => t !== '')
    .join(' ');

const resolveNameKorean = (nameEnglish) => {
  const confirmed = KR_CONFIRMED.get(nameEnglish.trim().toLowerCase());
  return confirmed ?? transliterateName(nameEnglish);
};

const parseListingPage = (html) => {
  const items = [];
  const re = /<li class="product [^"]*">([\s\S]*?)<\/li>/g;
  let m;
  while ((m = re.exec(html))) {
    const block = m[1];
    const linkM = block.match(/<a href="(https:\/\/sotooutdoors\.com\/product\/[^"]+)"[^>]*class="woocommerce-LoopProduct-link/);
    if (!linkM) continue;
    const titleM = block.match(/woocommerce-loop-product__title">([^<]+)</);
    const imgM = block.match(/<img[^>]*src="([^"]+)"/);
    items.push({
      url: linkM[1],
      nameEnglish: titleM ? unescapeHtml(titleM[1].trim()) : '',
      imageUrl: imgM ? imgM[1].split('?')[0] : '',
    });
  }
  return items;
};

const hasNextPage = (html) => /woocommerce-pagination[\s\S]*?class="next page-numbers"/.test(html);

const fetchAllListing = async (categorySlug) => {
  const all = [];
  let page = 1;
  for (;;) {
    const url = page === 1 ? `${BASE}/product-category/${categorySlug}/` : `${BASE}/product-category/${categorySlug}/page/${page}/`;
    const html = await fetchHtml(url);
    const items = parseListingPage(html);
    if (items.length === 0) break;
    all.push(...items);
    if (!hasNextPage(html)) break;
    page += 1;
    if (page > 20) break; // 안전장치
  }
  const seen = new Set();
  return all.filter((it) => (seen.has(it.url) ? false : (seen.add(it.url), true)));
};

// ".75 oz"처럼 정수부 없이 소수점으로 시작하는 표기가 실제로 있다(SOTO O-Rings) — 이전
// 정규식(\d+(?:\.\d+)?)은 앞자리 숫자가 필수라 "."을 건너뛰고 "75"를 통째로 읽어 75oz(2126g)
// 로 100배 부풀려졌다. 정수부가 없는 경우(\.\d+)도 허용.
const parseWeightG = (text) => {
  const m = text.match(/(\d+\.?\d*|\.\d+)\s*(oz|lb|lbs|g|kg)\b/i);
  if (!m) return 0;
  const val = parseFloat(m[1]);
  const unit = m[2].toLowerCase();
  if (unit === 'oz') return Math.round(val * 28.3495);
  if (unit === 'lb' || unit === 'lbs') return Math.round(val * 453.592);
  if (unit === 'kg') return Math.round(val * 1000);
  return Math.round(val);
};

const fetchDetail = async (url) => {
  const html = await fetchHtml(url);
  const titleM = html.match(/<h1[^>]*class="product_title[^>]*>([^<]+)</);
  const ogImageM = html.match(/property="og:image" content="([^"]+)"/);
  const idx = html.indexOf('woocommerce-product-attributes-item--weight');
  let weightG = 0;
  if (idx !== -1) {
    const seg = html.slice(idx, idx + 300);
    const valM = seg.match(/__value">([^<]+)</);
    if (valM) weightG = parseWeightG(unescapeHtml(valM[1]));
  }
  const skuM = html.match(/Product #([A-Z0-9-]+)/);
  return {
    nameEnglish: titleM ? unescapeHtml(titleM[1].trim()) : '',
    imageUrl: ogImageM ? ogImageM[1].split('?')[0] : '',
    weightG,
    sku: skuM ? skuM[1] : '',
  };
};

const buildRow = (item, category, detail) => {
  const nameEnglish = detail.nameEnglish || item.nameEnglish;
  const nameKorean = resolveNameKorean(nameEnglish);
  const specs = {};
  if (category === 'stove') specs.fuelType = 'gas';
  if (['cup', 'cookware_etc'].includes(category) && /set|combo/i.test(nameEnglish)) specs.isSet = true;
  return {
    groupId: `soto_${slugify(nameEnglish)}`,
    category,
    company: 'soto',
    companyKorean: '소토',
    name: nameEnglish,
    nameKorean,
    color: '',
    colorKorean: '',
    size: '',
    sizeKorean: '',
    weight: detail.weightG,
    imageUrl: detail.imageUrl || item.imageUrl,
    specs,
    _source: `${BASE}/product-category/${item._categorySlug}/#${category}`,
    _detailUrl: item.url,
    _productNo: detail.sku || item.url,
  };
};

export default {
  name: 'soto',
  company: 'soto',
  companyKorean: '소토',
  baseUrl: BASE,
  defaultCategories: ['stoves', 'cookware', 'accessories', 'parts'],
  crawl: async (_browser, { categoryUrls, withWeight = true } = {}) => {
    const slugs = categoryUrls?.length ? categoryUrls : ['stoves', 'cookware', 'accessories', 'parts'];
    const seen = new Set();
    const all = [];
    for (const slug of slugs) {
      console.log(`[soto] crawling ${slug}`);
      const items = await fetchAllListing(slug);
      console.log(`[soto]   ${slug}: ${items.length} listing items`);
      let i = 0;
      for (const item of items) {
        i += 1;
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        item._categorySlug = slug;
        const detail = withWeight
          ? await fetchDetail(item.url)
          : { nameEnglish: item.nameEnglish, imageUrl: '', weightG: 0, sku: '' };
        const category = catOf(slug, detail.nameEnglish || item.nameEnglish);
        all.push(buildRow(item, category, detail));
        if (i % 5 === 0) console.log(`[soto]   ${slug} detail ${i}/${items.length}`);
      }
    }
    return all;
  },
};

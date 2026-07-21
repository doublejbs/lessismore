// TheGearShop(thegearshop.co.kr) — 멀티브랜드 아웃도어 리테일러. 공개 REST API
// (api.thegearshop.co.kr)가 리스팅·상세·옵션(색상/사이즈)·스펙 전부 구조화 JSON으로 준다 —
// puppeteer 불필요, fetch만으로 크롤.
// 이번 크롤은 BLACK DIAMOND 제외 13개 브랜드(각자 category_id로 브라우징 진입점만 다름)만
// 대상: ARC'TERYX(2)·VEILANCE(58)·COTOPAXI(72)·SCARPA(105)·BIG AGNES(124)·GSI OUTDOORS(145)·
// MAD ROCK(164)·KARMA8A(198)·CIELE(202)·7MESH(203)·MELLOW(1146)·SUNGOD(1049)·SEISMIK(1050).
// company/companyKorean은 category_id가 아니라 그 상품 자신의 `brand.name_en`/`brand.name`
// 필드에서 가져온다 — category_id는 "그 브랜드 탭에 진열된 상품"일 뿐이고 콜라보 상품은 실제
// brand 필드가 다를 수 있다(실측: MAD ROCK(164) 카테고리에 SEISMIK 브랜드의 "매드락 에디션"
// 콜라보 티셔츠가 진열됨 — company는 실제 제조 브랜드(SEISMIK)를 따라야 정확하다).
// 무게/소재는 이미지가 아니라 `add_infos` 배열의 "중량"/"소재" 라벨에 텍스트로 바로 있다 —
// OCR 불필요. 카테고리 브레드크럼(`categories`)이 상품군까지 안 내려가는 브랜드가 많아
// (ARC'TERYX/SUNGOD/SCARPA 등은 보통 "브랜드>브랜드명"까지만, 심지어 7MESH는 빈 배열도 있음)
// 브레드크럼 우선 + 상품명 키워드 폴백으로 분류한다.
const API = 'https://api.thegearshop.co.kr/api';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const fetchJson = async (url) => {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};

// ── 한글 로마자 표기(RR) — API가 name_en 을 안 주는 상품(실측: 7MESH·MAD ROCK 일부 18개)의
// name(영문) 필드를 비워두지 않기 위한 폴백. Backcountry/Claymore 세션에서 확립한 테이블 재사용.
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
// size/name(영문) 필드에 넣기 전 한글 라벨(예: SCARPA 모델명 "에일리언")을 로마자로 바꾼다 —
// 이미 영문/숫자뿐이면 그대로 통과.
const englishize = (label) => (/[가-힣]/.test(label) ? romanizeName(label) : label);

const BRAND_CATEGORY_IDS = {
  2: 'ARCTERYX',
  58: 'VEILANCE',
  72: 'COTOPAXI',
  105: 'SCARPA',
  124: 'BIGAGNES',
  145: 'GSI',
  164: 'MADROCK',
  198: 'KARMA8A',
  202: 'CIELE',
  203: '7MESH',
  1146: 'MELLOW',
  1049: 'SUNGOD',
  1050: 'SEISMIK',
};

// ── 텍스트 유틸 ──────────────────────────────────────────────────────
const stripHtml = (html) =>
  (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

const findAddInfo = (addInfos, labelRe) => {
  for (const item of addInfos || []) {
    for (const [k, v] of Object.entries(item)) {
      if (labelRe.test(k.trim())) return stripHtml(v);
    }
  }
  return '';
};

// "(EU 42 기준) 360g" 처럼 사이즈 조건이 앞에 붙어도 첫 "N(kg|g)" 패턴만 뽑는다.
// "117 x 89 x 104 mmg" 같은 소스측 데이터 오류(치수 필드와 무게 필드가 잘못 붙은 경우)는
// 숫자 바로 뒤에 공백만 있고 g가 와야 매칭되므로 자동으로 걸러진다("mm"이 끼면 매칭 안 됨).
const WEIGHT_RE = /(\d+(?:\.\d+)?)\s*(kg|g)\b/i;
const LB_OZ_RE = /(\d+(?:\.\d+)?)\s*lb\s*(\d+(?:\.\d+)?)\s*oz/i;
// ⚠ "중량" 값에 미터법+영미법이 같이 적혀있는 줄에서 kg 라벨이 잘못 붙는 소스 오류가 실측됨
// (BIG AGNES 우드척 테이블/미카 베이슨 체어: "Weight 2lb 3oz/ 992kg" — 2lb3oz≈992g인데 단위가
// kg으로 잘못 표기되어 992000g으로 계산됨). 무게 줄에 lb+oz 조합이 같이 있으면 그걸 우선
// 신뢰(영미법 병기는 보통 사람이 직접 입력, kg/g 쪽은 자동변환 스크립트 버그 가능성이 높다).
// lb/oz 병기가 없어 위 교차검증도 못 하는 kg 오표기 사례도 있다(실측: 미카 베이신 체어
// "Weight: 992kg" — 마케팅 문구("디자인" 필드)에는 "992g 이지만..."이라고 정확히 적혀 있어
// 992kg은 명백한 오탈자). 이 사이트 실측 최대 정상 무게가 10.46kg이라 20kg 상한을 넘으면
// 단위 오표기로 간주하고 버린다(CLAYMORE 세션에서 확립한 플라우저빌리티 필터와 동일 원칙).
const MAX_PLAUSIBLE_WEIGHT_G = 20000;
const extractWeightG = (addInfos) => {
  const raw = findAddInfo(addInfos, /^중량$/);
  if (!raw) return 0;
  const weightLine = raw.split(/\r?\n/).find((l) => /weight/i.test(l)) || raw;
  const lbOz = weightLine.match(LB_OZ_RE);
  if (lbOz) return Math.round(parseFloat(lbOz[1]) * 453.592 + parseFloat(lbOz[2]) * 28.3495);
  const m = weightLine.match(WEIGHT_RE);
  if (!m) return 0;
  const v = parseFloat(m[1]);
  const grams = Math.round(m[2].toLowerCase() === 'kg' ? v * 1000 : v);
  return grams > MAX_PLAUSIBLE_WEIGHT_G ? 0 : grams;
};

const extractMaterial = (addInfos) => findAddInfo(addInfos, /^소재$/);

// ── 무게 폴백 — "중량" add_info 키 자체가 없는 상품 중 일부(실측: BIG AGNES 텐트·백팩,
// ARC'TERYX 백팩)는 "제품특징" 또는 description 텍스트 안에 "Weight :"/"Packed Weight :"/
// 한글 "무게" 라벨로 값이 그냥 박혀 있다. "중량" 키가 있으면 이 폴백은 시도하지 않는다.
const SIZE_ABBR_PRIORITY = [
  ['XL', 'X-Large'], ['XS', 'X-Small'], ['XXL', 'XX-Large'],
  ['LG', 'Large'], ['SM', 'Small'], ['MD', 'Medium'],
];
// ⚠ 라벨 바로 뒤에 영미법(lb/oz)이 먼저 오고 미터법이 슬래시 뒤에 오는 경우가 있다(실측:
// BIG SIX CAMP CHAIR "Weight 3lb 3oz/ 1.45kg", SOUL KITCHEN CAMP TABLE·FOOTPRINT WYOMING
// TRAIL 4도 동일 패턴) — 라벨~kg|g 사이에 lb/oz 텍스트가 끼어도 잡히도록 최대 20자까지
// 느슨하게 허용한다(그래도 줄바꿈은 안 넘어가게 `[^\n]`로 한정).
// ⚠ 한글 라벨이 "무게"뿐 아니라 "중량"으로도 쓰인다(실측: BIG AGNES PUMPHOUSE ULTRA
// "제품 중량: 2.9oz/82g" — add_infos의 "중량" 키가 아니라 "제품특징" 본문 안에 라벨로
// 등장하는 케이스라 이 폴백에서 "무게"만 찾으면 놓친다).
const findWeightLabelMatches = (text) => {
  const out = [];
  const re = /(Packed\s*Weight|Weight|중량|무게)\s*[:：]?[^\n]{0,20}?(\d+(?:\.\d+)?)\s*(kg|g)\b/gi;
  let m;
  while ((m = re.exec(text))) {
    const v = parseFloat(m[2]);
    const grams = Math.round(m[3].toLowerCase() === 'kg' ? v * 1000 : v);
    out.push({ label: m[1].toLowerCase(), grams });
  }
  return out;
};
const pickBestWeightMatch = (matches) => {
  if (!matches.length) return 0;
  const packed = matches.find((x) => x.label.includes('packed'));
  const grams = (packed || matches[0]).grams;
  return grams > MAX_PLAUSIBLE_WEIGHT_G ? 0 : grams;
};
// "Size : 남성 Medium ... Weight :1.39kg ... Size : 남성 Large ... Weight : 1.45kg" 처럼
// 사이즈별로 반복되는 블록에서 각 사이즈의 무게를 따로 뽑는다(실측: 프로스펙터 50L/파크뷰
// 63L — M/L 사이즈별로 Weight 값이 다름).
const splitBySizeBlocks = (text) => {
  const re = /Size\s*[:：]/gi;
  const starts = [];
  let m;
  while ((m = re.exec(text))) starts.push(m.index);
  if (starts.length < 2) return null;
  return starts.map((s, i) => text.slice(s, i + 1 < starts.length ? starts[i + 1] : text.length));
};
const extractFallbackWeight = (product) => {
  const featureText = findAddInfo(product.add_infos, /^제품특징$/);
  const descText = stripHtml(product.description);
  const combined = [featureText, descText].filter(Boolean).join('\n');
  if (!combined) return { type: 'none' };
  const blocks = splitBySizeBlocks(combined);
  if (blocks) {
    const map = new Map();
    for (const block of blocks) {
      const grams = pickBestWeightMatch(findWeightLabelMatches(block));
      if (!grams) continue;
      const header = block.slice(0, 60);
      for (const [abbr, word] of SIZE_ABBR_PRIORITY) {
        if (new RegExp(`\\b${word}\\b`, 'i').test(header)) {
          map.set(abbr, grams);
          break;
        }
      }
    }
    if (map.size) return { type: 'bySize', map };
  }
  const grams = pickBestWeightMatch(findWeightLabelMatches(combined));
  return grams ? { type: 'single', grams } : { type: 'none' };
};

// ── 카테고리 분류 ─────────────────────────────────────────────────────
// 브레드크럼 마지막 세그먼트 우선, 없거나 안 맞으면 상품명 키워드로 폴백.
// ⚠ 브랜드마다 브레드크럼 구분자/표기가 다르다("텐트, 풋프린트" vs "텐트&풋프린트") — 최종
// 세그먼트를 정확히 일치시켜야 하니 실제로 나오는 표기를 다 등록해야 한다(하나 놓치면 그
// 브랜드 라인 전체가 조용히 etc로 샌다 — BIG AGNES "텐트&풋프린트"/"에어매트" 미등록으로
// 실측 발견).
const BREADCRUMB_MAP = {
  텐트: 'tent', '텐트, 풋프린트': 'tent', '텐트&풋프린트': 'tent', 풋프린트: 'tent_acc',
  타프: 'tarp', 쉘터: 'shelter', 침낭: 'sleeping_bag', 매트: 'mat', 에어매트: 'mat',
  '패드&필로우': 'mat', 베개: 'pillow', 컵: 'cup', 보울: 'bowl', 그릇: 'bowl',
  커트러리: 'cutlery', 나이프: 'cutlery', 스토브: 'stove', 버너: 'stove', 랜턴: 'torch',
  보틀: 'bottle', 쿠킹세트: 'cookware_etc', 체어: 'chair', 의자: 'chair', 테이블: 'table',
  선글라스: 'sunglasses', 고글: 'sunglasses', 게이터: 'gaiter', 장갑: 'gloves', 글러브: 'gloves',
  헤드램프: 'lighting', 조명: 'lighting', 파우치: 'pouch', '가방(파우치)': 'pouch',
  트레킹폴: 'trekking_pole', 배낭: 'backpack', 백팩: 'backpack',
  모자: 'clothing', 신발: 'etc', 상의: 'clothing', 하의: 'clothing', 아우터: 'clothing',
};
// 브랜드마다 상품명을 한글/영문 어느 쪽으로 쓸지 제각각이라(ARC'TERYX/SUNGOD는 영문 위주,
// CIELE의 "FSTCap"·"GOCap"처럼 한글 키워드가 전혀 안 들어가는 경우도 흔함) 한글·영문 키워드를
// 같은 목록에 같이 둔다.
const NAME_KEYWORD_MAP = [
  [/선글라스|고글|아이웨어|sunglasses|goggle/i, 'sunglasses'],
  [/장갑|글러브|미튼|gloves?|mitten/i, 'gloves'],
  [/게이터|gaiter/i, 'gaiter'],
  [/백팩\s*커버|팩\s*커버|pack\s*cover/i, 'backpack_cover'],
  [/배낭|백팩|backpack|daypack/i, 'backpack'],
  [/텐트|풋프린트|tent|footprint/i, 'tent'],
  [/타프(?!\s*폴)|\btarp\b/i, 'tarp'],
  [/침낭|슬리핑\s*백|sleeping\s*bag/i, 'sleeping_bag'],
  [/매트리스|에어매트|폼매트|sleeping\s*mat|air\s*pad/i, 'mat'],
  [/베개|필로우|\bpillow\b/i, 'pillow'],
  [/캠프\s*컵|머그|\bmug\b|camp\s*cup/i, 'cup'],
  [/보울|그릇|\bbowl\b/i, 'bowl'],
  [/나이프|스푼|포크|커트러리|\bknife\b|cutlery/i, 'cutlery'],
  [/스토브|버너|\bstove\b/i, 'stove'],
  [/랜턴|헤드램프|조명|lantern|headlamp/i, 'torch'],
  [/보틀|물통|\bbottle\b/i, 'bottle'],
  [/체어|의자|\bchair\b/i, 'chair'],
  [/테이블|\btable\b/i, 'table'],
  [/트레킹\s*폴|스틱|trekking\s*pole/i, 'trekking_pole'],
  // ⚠ \b(단어경계)는 ASCII 단어문자[A-Za-z0-9_] 기준이라 한글 옆에는 절대 안 걸린다
  // ("캡\b"가 "5패널 캡"에서 안 걸려 COTOPAXI 모자가 etc로 샌 사고 실측) — 한글 키워드는
  // \b 없이 순수 부분일치로, 영문 키워드만 오검출 방지용으로 \b를 쓴다.
  [/모자|캡|비니|버킷햇|\bcap\b|\bbeanie\b|bucket\s*hat|\bhat\b/i, 'clothing'],
  [
    /재킷|자켓|셔츠|팬츠|쇼츠|후디|베스트|탱크|드레스|스커트|타이즈|레깅스|브리프|박서|양말|jacket|shirt|pants|shorts|hoodie|vest|tank|dress|skirt|tights|leggings|brief|boxer|jersey|sweater|fleece|\bsock/i,
    'clothing',
  ],
  [/신발|슈즈|부츠|샌들|shoes?|boots?|sandals?/i, 'etc'],
];

// SUNGOD은 전 제품이 선글라스뿐인 단일 품목 브랜드인데, 브레드크럼이 "브랜드>SUNGOD"까지만
// 있고 상품명도 모델명(Vulcans/Ultras 등)뿐이라 브레드크럼·키워드 둘 다 못 잡는다(실측: 41개
// 전부 etc로 떨어짐) — 이 브랜드만 확실하므로 폴백 전에 브랜드 단위로 먼저 확정한다.
const BRAND_FIXED_CATEGORY = { SUNGOD: 'sunglasses' };

// "메쉬 이너"(교체용 이너텐트)는 브레드크럼상 "텐트&풋프린트"에 걸려도 텐트 본체가 아니라
// 부속품이다 — 브레드크럼 판정보다 먼저 걸러야 한다(Backcountry/Hilleberg 세션에서도 같은
// 이유로 이너텐트를 tent_acc로 뺐음).
const INNER_TENT_RE = /메쉬\s*이너|이너\s*텐트|inner\s*tent/i;

const classify = (categories, productName, brandNameEn) => {
  if (BRAND_FIXED_CATEGORY[brandNameEn]) return BRAND_FIXED_CATEGORY[brandNameEn];
  if (INNER_TENT_RE.test(productName)) return 'tent_acc';
  const crumbs = (categories || []).map((c) => c.name);
  for (let i = crumbs.length - 1; i >= 0; i -= 1) {
    if (BREADCRUMB_MAP[crumbs[i]]) return BREADCRUMB_MAP[crumbs[i]];
  }
  for (const [re, cat] of NAME_KEYWORD_MAP) {
    if (re.test(productName)) return cat;
  }
  return 'etc';
};

// ── 크롤 ──────────────────────────────────────────────────────────
const fetchCategoryProductIds = async (categoryId) => {
  const ids = [];
  let page = 1;
  let total = Infinity;
  while (ids.length < total) {
    const data = await fetchJson(
      `${API}/products/search?page=${page}&sort=MDASC&display_size=100&is_filter=0&category_id=${categoryId}`
    );
    const rows = data.data.rows || [];
    total = data.data.count ?? rows.length;
    ids.push(...rows.map((r) => r.product_id));
    if (rows.length === 0) break;
    page += 1;
  }
  return [...new Set(ids)];
};

const slugify = (s) => s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9가-힣-]/g, '');

// `add_infos`/`description` 텍스트에 아무 것도 없어도 무게가 완전히 없는 건 아니다 —
// `description` HTML의 <img>가 이 사이트 자신의 CDN(product.thegearshop.co.kr)이 아니라
// 완전히 다른 도메인(nelson2.godohosting.com)의 "상세페이지 이미지"를 가리키는 경우가 있고,
// 그 이미지 자체에 SPECS & SIZING 표가 그림으로 박혀 있다(실측: 636516 GUARD STATION 4 —
// description의 `.../bigagnes/2020/detail/ESKXU00692_detail.jpg`를 사람이 열어 봐야 "Packed
// Weight : 6.21kg"이 보임, add_infos는 빈 배열). 텍스트 파싱만으로는 원천적으로 못 잡으므로
// Claude vision으로 직접 읽어 확인한 값만 여기 등록한다(자동 OCR 파이프라인 아님 — 이 사이트
// 특유의 도메인 분리 패턴이 흔치 않아 스크립트화하지 않고 수동 검증값으로 남김).
const OCR_VERIFIED_WEIGHTS_G = {
  636516: 6210, // GUARD STATION 4(ESKXU00692) — Packed Weight 6.21kg, 2026-07-21 검증
};

const buildRowsForProduct = (product) => {
  const category = classify(product.categories, product.name, product.brand?.name_en);
  const weightG = extractWeightG(product.add_infos);
  const fallbackWeight = weightG === 0 ? extractFallbackWeight(product) : null;
  const ocrWeight = OCR_VERIFIED_WEIGHTS_G[product.id] || 0;
  const resolveWeight = (sizeRaw) => {
    if (weightG > 0) return weightG;
    if (fallbackWeight) {
      if (fallbackWeight.type === 'single') return fallbackWeight.grams;
      if (fallbackWeight.type === 'bySize' && sizeRaw && fallbackWeight.map.has(sizeRaw.toUpperCase())) {
        return fallbackWeight.map.get(sizeRaw.toUpperCase());
      }
    }
    return ocrWeight;
  };
  // 소재는 카테고리 스키마와 무관하게 항상 material 키로 채운다 — 스키마에 그 필드가 없는
  // 카테고리라도 push.js/미리보기가 스키마 밖 키는 그냥 무시하므로 안전하다.
  const material = extractMaterial(product.add_infos);
  const companyEn = (product.brand?.name_en || '').trim();
  const companyKey = companyEn ? slugify(companyEn.replace(/'/g, '')) : 'thegearshop-unknown';

  // ⚠ level===1이 항상 색상은 아니다 — SCARPA 일부 상품은 level 1 옵션의 label이 "단일옵션"
  // (type DROPDOWN)이고 값이 실제로는 신발 세부 모델명("에일리언"·"T2 에코" 등)이다. 실제
  // COLOR_CHIP 타입인지로 판별해야 한다(레벨 숫자로 판별하면 모델명이 color 필드로 새서
  // colorKorean에 색상 아닌 한글 문자열이 들어가는 사고가 났다).
  const allAxes = product.options || [];
  const colorAxis = allAxes.find((o) => o.type === 'COLOR_CHIP');
  const sizeAxis = allAxes.find((o) => o !== colorAxis);
  const rowBase = {
    groupId: `${companyKey}_${slugify(product.code || String(product.id))}`,
    category,
    company: companyKey,
    companyKorean: product.brand?.name || '',
    // name_en이 있어도 일부 토큰만 번역되고 한글이 섞여 남는 경우가 실측됨(예: 매드락 로프
    // 상품의 name_en = "9.4 Mad Rock 로프 70m") — romanizeName은 이미 영문/숫자인 토큰은
    // 그대로 두고 한글 토큰만 음역하므로 완전 영문 name_en에도 안전하게 적용 가능.
    name: romanizeName(product.name_en || product.name),
    nameKorean: product.name,
    weight: resolveWeight(null),
    specs: material ? { material } : {},
    _source: `https://thegearshop.co.kr/products/view/${product.id}`,
    _detailUrl: `https://thegearshop.co.kr/products/view/${product.id}`,
    _productNo: String(product.id),
  };

  const fallbackImage0 = (product.images && product.images[0]) || '';

  if (!colorAxis && !sizeAxis) {
    return [{ ...rowBase, color: '', colorKorean: '', size: '', sizeKorean: '', imageUrl: fallbackImage0 }];
  }

  // 진짜 색상 축이 없는 상품(예: SCARPA "단일옵션"/DROPDOWN 축 — 값이 실은 신발 모델명)은
  // 그 축을 size로만 쓴다. color는 항상 빈 문자열.
  // ⚠ 이 축 값이 신발 모델명이라 한글인 경우가 있다(실측: "에일리언","T2 에코" 등) — size(영문)
  // 에 한글이 새면 안 되므로 한글이면 로마자 음역, sizeKorean/nameKorean은 원문 그대로 둔다.
  if (!colorAxis) {
    return sizeAxis.values.map((v) => {
      const sizeLabel = v.value !== 'ONE SIZE' ? v.value : '';
      const sizeLabelEn = sizeLabel ? englishize(sizeLabel) : '';
      return {
        ...rowBase,
        name: sizeLabelEn ? `${rowBase.name} / ${sizeLabelEn}` : rowBase.name,
        nameKorean: sizeLabel ? `${rowBase.nameKorean} ${sizeLabel}` : rowBase.nameKorean,
        color: '',
        colorKorean: '',
        size: sizeLabelEn,
        sizeKorean: sizeLabel,
        weight: resolveWeight(v.value),
        imageUrl: v.images?.[0] || fallbackImage0,
      };
    });
  }

  // 색상별 이미지가 소스에 통째로 빠진 경우가 있다(실측: CIELE 686364 — SILVERPINE만 이미지
  // 있고 LIMEGREEN/CHAMBRAY/BLOSSOM은 images:[] 그대로) — 그 색상만 빈 값으로 두면 안 되니
  // 같은 상품의 다른 색상 이미지로 대체한다(완전히 무관한 이미지보다 같은 상품 사진이 낫다).
  const fallbackImage = colorAxis.values.map((v) => v.images?.[0]).find(Boolean) || fallbackImage0;
  // 색상 옵션이 있는 상품인데 "기타"만 단일 값으로 들어있는 경우가 있다(실측: 확정 색상이
  // 없는 상품에 사이트가 채워둔 자리표시자) — 진짜 색상명이 아니므로 color/colorKorean은
  // 빈 문자열로 둔다.
  const GENERIC_COLOR_PLACEHOLDERS = new Set(['기타']);
  const isRealColor = (v) => !!v && !GENERIC_COLOR_PLACEHOLDERS.has(v.trim());

  const rows = [];
  for (const colorVal of colorAxis.values) {
    const sizeVals = sizeAxis ? sizeAxis.values.filter((v) => v.parent_ids?.includes(colorVal.id)) : [null];
    const image = colorVal.images?.[0] || fallbackImage;
    const colorReal = isRealColor(colorVal.value);
    for (const sizeVal of sizeVals) {
      const sizeLabel = sizeVal && sizeVal.value !== 'ONE SIZE' ? sizeVal.value : '';
      const sizeLabelEn = sizeLabel ? englishize(sizeLabel) : '';
      rows.push({
        ...rowBase,
        name: sizeLabelEn ? `${rowBase.name} / ${sizeLabelEn}` : rowBase.name,
        nameKorean: sizeLabel ? `${rowBase.nameKorean} ${sizeLabel}` : rowBase.nameKorean,
        color: colorReal ? colorVal.value : '',
        colorKorean: colorReal ? colorVal.value : '',
        size: sizeLabelEn,
        sizeKorean: sizeLabel,
        weight: resolveWeight(sizeVal?.value),
        imageUrl: image,
      });
    }
  }
  return rows;
};

export default {
  name: 'thegearshop',
  company: 'thegearshop',
  companyKorean: '더 기어샵',
  baseUrl: 'https://thegearshop.co.kr',
  defaultCategories: Object.keys(BRAND_CATEGORY_IDS),
  crawl: async (browser, { categoryUrls } = {}) => {
    const categoryIds = categoryUrls?.length ? categoryUrls : Object.keys(BRAND_CATEGORY_IDS);
    const seenIds = new Set();
    const all = [];
    for (const categoryId of categoryIds) {
      console.log(`[thegearshop] crawling category_id=${categoryId} (${BRAND_CATEGORY_IDS[categoryId] ?? ''})`);
      const productIds = await fetchCategoryProductIds(categoryId);
      console.log(`[thegearshop]   ${productIds.length} listing items`);
      let i = 0;
      for (const productId of productIds) {
        i += 1;
        if (seenIds.has(productId)) continue;
        seenIds.add(productId);
        try {
          const detail = await fetchJson(`${API}/products/${productId}`);
          const product = detail.data.product;
          all.push(...buildRowsForProduct(product));
        } catch (e) {
          console.log(`[thegearshop]   error on ${productId}: ${e.message} — skipping`);
        }
        if (i % 20 === 0) console.log(`[thegearshop]   ${i}/${productIds.length}`);
      }
    }
    return all;
  },
};

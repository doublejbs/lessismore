// 코오롱스포츠(kolonsport.com) — Next.js(Apollo GraphQL) 사이트. `/graphql_private` 엔드포인트가
// 인증/영속쿼리 해시 없이도 완전한 쿼리 텍스트를 POST로 받아준다(introspection만 막혀있음) —
// puppeteer 불필요, fetch만으로 크롤. 국내 전용 브랜드라 영문명이 없어 로마자 음역 필요.
//
// ⚠ 구조화 필드 `product.weight`는 사이트 전체에서 사실상 항상 0이라 못 믿는다(실측: 텐트·
// 백팩·신발·장갑·스틱 전부 0). 실제 값은 `description` 마케팅 문구 안에 "무게 : 14.84kg"/
// "무게 930g (레인커버 제외)"/"1,350g의 초경량 무게" 등 다양한 어순으로 박혀 있어 정규식
// 2방향(라벨→값, 값→라벨)으로 추출한다. 신발은 "사이즈 및 무게 가이드"라는 섹션 제목이 있어도
// 실제로는 치수(총길이/전체높이/굽높이)만 있고 무게 자체가 없는 경우가 흔함(오탐 주의 — 실측
// 하이킹화 다수 확인, 무게 값 자체가 없음).
//
// 소재는 `fabric` 필드에 이미 깨끗한 텍스트로 있다(단 "상세설명 참조"처럼 값이 없는 placeholder
// 도 있음). 색상은 `swatchColors`(영문, 예: "BEIGE")를 color로, `style`(한글, 예: "라이트
// 베이지")을 colorKorean으로 그대로 매핑 — 별도 사전 불필요. 사이즈는 색상마다 별도 상세조회를
// 해야 나온다(카테고리 리스팅은 색상 단위로만 항목을 주고, `variantOptions`가 상세조회 안에만
// 있음). "XXX"는 사이트 자체의 "사이즈 없음(One Size)" 표기.
const API = 'https://www.kolonsport.com/graphql_private';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const gql = async (query) => {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA, Accept: 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error(`${r.status} graphql`);
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
};

// ── 한글 로마자 표기(RR) — thegearshop/claymore/backcountry 세션에서 확립한 테이블 재사용.
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

const slugify = (s) => s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9가-힣-]/g, '');

// ── 카테고리 분류 ─────────────────────────────────────────────────────
// 의류>{아우터,상의,하의,베이스레이어} / 신발>{하이킹,어프로치,에브리데이,인솔,부츠·슬라이드} /
// 가방>{백팩,힙색·슬링백,크로스백·토트백} / 용품>{모자,장갑,양말,머플러,솟솟굿즈,기타용품} /
// 등산장비>스틱 / 캠핑>{텐트,매트·침낭,캠핑주방,기타용품}. "컬렉션"류 기획전 페이지(고어텍스·
// 트레일러닝·데이팩 등)는 위 실제 카테고리와 상품이 중복되므로 크롤 대상에서 제외.
const CATEGORY_MAP = {
  105010080100: 'clothing', // 아우터
  105010080200: 'clothing', // 상의
  105010080300: 'clothing', // 하의
  105010080400: 'clothing', // 베이스레이어
  105010090100: 'etc', // 신발-하이킹
  105010090700: 'etc', // 신발-어프로치
  105010090800: 'etc', // 신발-에브리데이
  105010090600: 'etc', // 신발-인솔
  105010090400: 'etc', // 신발-부츠/슬라이드
  105010100100: 'backpack', // 백팩
  105010100200: 'vest_pack', // 힙색/슬링백
  105010100300: 'pouch', // 크로스백/토트백
  105010110100: 'clothing', // 모자
  105010110200: 'gloves', // 장갑
  105010110300: 'clothing', // 양말
  105010110500: 'clothing', // 머플러
  105010110600: 'etc', // 솟솟굿즈(브랜드 굿즈)
  105010110700: 'etc', // 용품-기타용품
  105010120100: 'trekking_pole', // 스틱
  105010130100: 'tent', // 텐트
  105010130500: null, // 매트/침낭 — 상품명 키워드로 세분류
  105010130400: null, // 캠핑 주방 — 상품명 키워드로 세분류
  105010130600: null, // 캠핑-기타용품 — 상품명 키워드로 세분류
};

// "매트/침낭" 카테고리는 침낭·매트·풋프린트/이너(텐트 부속)가 섞여 있다(실측: 6개 중
// 침낭 2개, 패드 2개, 풋프린트+이너그라운드시트 2개).
const classifyMatSleepCategory = (name) => {
  if (/침낭|sleeping\s*bag/i.test(name)) return 'sleeping_bag';
  if (/풋프린트|그라운드\s*시트|이너/i.test(name)) return 'tent_acc';
  if (/패드|매트|\bpad\b/i.test(name)) return 'mat';
  return 'etc';
};
// "캠핑 주방" 카테고리는 쿠커·주전자·수저세트·쿡웨어세트·스토브세트가 섞여 있다.
const classifyCampKitchenCategory = (name) => {
  if (/수저|커트러리|나이프|스푼/i.test(name)) return 'cutlery';
  if (/스토브|버너|\bstove\b/i.test(name)) return 'stove';
  if (/컵|머그|\bcup\b/i.test(name)) return 'cup';
  if (/보울|그릇|\bbowl\b/i.test(name)) return 'bowl';
  return 'cookware_etc'; // 쿠커/주전자/쿡웨어세트
};
// "캠핑 기타용품"도 실제로는 텐트 부속·스토브가 섞여 있다(실측: 3개 중 "하이엔드 쉘터
// 이너 텐트"·"하이엔드 쉘터 루프"(둘 다 텐트 본체 아닌 부속)·"익스페디션 라이트 스토브"
// — 전부 flat 'etc'로 두면 원래 있어야 할 tent_acc/stove로 안 감).
const classifyCampEtcCategory = (name) => {
  if (/스토브|버너|\bstove\b/i.test(name)) return 'stove';
  if (/이너\s*텐트|쉘터\s*루프|텐트\s*루프|그라운드\s*시트|풋프린트/i.test(name)) return 'tent_acc';
  return 'etc';
};
const classify = (categoryId, name) => {
  const mapped = CATEGORY_MAP[categoryId];
  if (mapped) return mapped;
  if (categoryId === 105010130500) return classifyMatSleepCategory(name);
  if (categoryId === 105010130400) return classifyCampKitchenCategory(name);
  if (categoryId === 105010130600) return classifyCampEtcCategory(name);
  return 'etc';
};

// ── 무게 추출 (마케팅 문구 정규식, 라벨→값 / 값→라벨 양방향) ──────────────────
// ⚠ 다른 브랜드 세션(thegearshop 등)에서 쓰던 20kg 상한을 그대로 가져오면 안 된다 — 코오롱
// 스포츠는 5~6인용 대형 쉘터(예: "50주년 기념 에디션 빅돔" 25.3kg)를 정상적으로 판매하므로
// 20kg이 실제 정상 무게를 오탐 거부하는 사고가 났다(실측). 50kg으로 넉넉히 잡는다.
const MAX_PLAUSIBLE_WEIGHT_G = 50000;
// ⚠ "무게" 앞에 붙은 명사가 본품이 아니라 "동봉된 부속품"의 무게인 경우가 있다(실측: 트레일
// 러닝 베스트 설명에 "*소프트 플라스크 무게 : 34g" — 베스트 자체 무게가 아니라 같이 오는
// 소프트 플라스크(수통)의 무게. 이 상품엔 다른 무게 언급이 아예 없어서 이 값을 그대로
// 쓰면 34g짜리 베스트라는 말이 안 되는 값이 나온다). 알려진 부속품 명사가 바로 앞에 있으면
// 그 매치는 버린다(총/제품 등은 본품 무게이므로 통과).
const ACCESSORY_NOUN_RE = '플라스크|풋프린트|그라운드\\s*시트|스터프\\s*색|이너\\s*텐트|파우치|케이스|커버';
// ⚠ "무게"/"중량" 라벨과 실제 값 사이에 부품명이 한 겹 더 끼는 경우가 흔하다(실측: 티타늄
// 쿠커 "중량 : 본체 : 149g / 수납 케이스 : 42g", 수저세트 "중량 : 숟가락 16g"). 콜론 유무에
// 상관없이 한글 단어 하나까지는 건너뛰고 숫자를 찾는다 — 맨 처음 나오는 값(보통 본체/메인
// 부품)을 채택.
const WEIGHT_FORWARD_RE = new RegExp(
  `(?<!(?:${ACCESSORY_NOUN_RE})\\s*)(?:총\\s*)?(?:무게|중량)\\s*[:：\\-–]?\\s*(?:[가-힣]{1,6}\\s*[:：]?\\s*)?(\\d[\\d,]*(?:\\.\\d+)?)\\s*(kg|g)\\b`,
  'i'
);
const WEIGHT_BACKWARD_RE = /(\d[\d,]*(?:\.\d+)?)\s*(kg|g)\s*(?:의|만의)?\s*(?:초경량\s*)?무게/i;
const stripHtml = (html) =>
  (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
const extractWeightFromDescription = (description) => {
  const clean = stripHtml(description);
  const m = clean.match(WEIGHT_FORWARD_RE) || clean.match(WEIGHT_BACKWARD_RE);
  if (!m) return 0;
  const v = parseFloat(m[1].replace(/,/g, ''));
  const grams = Math.round(m[2].toLowerCase() === 'kg' ? v * 1000 : v);
  return grams <= 0 || grams > MAX_PLAUSIBLE_WEIGHT_G ? 0 : grams;
};

// ⚠ 사이즈별 무게를 "라벨(g) 값1 값2 값3" 표 형태로 나열하는 상품이 있다(실측: 트레일러닝
// 힙벨트 — "항목 S M L ... 중량(g) 68 72 76", S/M/L 순서와 값 순서가 그대로 대응). 콤마 없는
// 단순 숫자 나열이라 위 정규식(라벨→값 1개)으로는 안 잡히므로 "(g)" 헤더 뒤 숫자 나열을
// 따로 뽑아 variantOptions 순서와 인덱스로 매칭한다.
const WEIGHT_TABLE_RE = /(?:무게|중량)\s*\(\s*g\s*\)\s*((?:\d+(?:\.\d+)?\s+){1,9}\d+(?:\.\d+)?)/i;
const extractWeightTable = (description) => {
  const clean = stripHtml(description);
  const m = clean.match(WEIGHT_TABLE_RE);
  if (!m) return null;
  const nums = m[1]
    .trim()
    .split(/\s+/)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0 && n <= MAX_PLAUSIBLE_WEIGHT_G);
  return nums.length ? nums : null;
};

// ⚠ "상세설명 참조"/"-"/"겉감:"(라벨만 있고 값 없음)/null 등 값 없음을 뜻하는 자리표시자가
// 다양하게 섞여 있다(실측: 텐트류는 "상세설명 참조", 일부 상품은 그냥 "-", 일부는 라벨만
// 있고 콜론 뒤가 빈 문자열).
const GENERIC_MATERIAL_PLACEHOLDERS = new Set(['상세설명 참조', '-', '']);
const extractMaterial = (fabric) => {
  const v = (fabric || '').trim();
  if (GENERIC_MATERIAL_PLACEHOLDERS.has(v)) return '';
  if (/^[가-힣0-9,\s]*:\s*$/.test(v)) return '';
  return v;
};

const GENDER_MAP = { MALE: 'male', FEMALE: 'female', COMMON: 'unisex', UNISEX: 'unisex' };

// 사이트 자체의 "사이즈 없음" 표기. 실측: 텐트·기어류 단일옵션 상품의 legacySize.
const NO_SIZE_TOKENS = new Set(['XXX', 'FREE', 'ONE SIZE', '']);

// ── 리스팅 (카테고리별 색상 단위 상품 코드 수집) ───────────────────────────
const PAGE_SIZE = 100;
const fetchCategoryProductCodes = async (categoryId) => {
  const codes = [];
  let page = 1;
  for (;;) {
    const data = await gql(
      `query { products(where: {categoryId: "${categoryId}", sort: "newProduct-desc", page: ${page}, pageSize: ${PAGE_SIZE}}) { results { code } page { totalCount } } }`
    );
    const { results, page: pageInfo } = data.products;
    codes.push(...results.map((r) => r.code));
    if (results.length === 0 || codes.length >= pageInfo.totalCount) break;
    page += 1;
  }
  return codes;
};

const fetchProductDetail = async (code) => {
  const data = await gql(
    `query { productDetail(where: {productCode: "${code}", isNaverEp: false}) { product {
      code name description fabric style originCountry season manufacturerName
      baseProductCode productGender swatchColors
      images { imageLS { url } }
      variantOptions { code legacySize }
    } } }`
  );
  return data.productDetail.product;
};

// ⚠ `description` 텍스트가 비어보여도(길이 1 등) 무게가 없는 게 아니라 <img> 한 장짜리
// HTML만 있고 그 이미지 자체에 스펙표가 그림으로 박혀 있는 경우가 있다(실측: 텐트
// "에어로라이트 4" — description이 `/medias/<code>-4.jpg?context=...` 이미지 하나뿐이고
// Claude vision으로 열어보니 "미니멈 무게 2.37kg / 풀 패킹 무게 2.55kg" 비교표가 있었음.
// 침낭 "AEROLITE SLEEPING BAG 500/300"도 `images.kolonmall.com/upload/default/...jpg`
// 이미지 안에 "Fill Weight/Carry Bag/Mesh Bag/Total Weight" 표가 있었음). 텍스트만으로는
// 원천적으로 못 잡으므로 Claude vision으로 직접 읽어 확인한 값만 등록한다(자동 OCR
// 파이프라인 아님 — thegearshop 세션과 동일한 패턴).
const OCR_VERIFIED_WEIGHTS_G = {
  KEXBX24921KHA: 2550, // 에어로라이트 4 — 풀 패킹 무게 2.55kg, 2026-07-21 검증
  KEXDX25500LIM: 768, // AEROLITE SLEEPING BAG 500 — Total Weight 768g, 2026-07-21 검증
  KEXDX25300LIM: 554, // AEROLITE SLEEPING BAG 300 — Total Weight 554g, 2026-07-21 검증
};

const buildRowsForProduct = (product, categoryId) => {
  const nameKo = (product.name || '').trim();
  const category = classify(categoryId, nameKo);
  const weightG = extractWeightFromDescription(product.description) || OCR_VERIFIED_WEIGHTS_G[product.code] || 0;
  // "중량(g) 68 72 76" 같은 사이즈별 표는 variantOptions와 같은 순서(사이즈 오름차순)라고
  // 가정하고 인덱스로 매칭한다 — 개수가 정확히 일치할 때만 사용(불일치 시 폴백 없이 flat 값).
  const weightTable = weightG === 0 ? extractWeightTable(product.description) : null;
  const material = extractMaterial(product.fabric);
  const gender = GENDER_MAP[product.productGender] || '';
  // ⚠ `swatchColors`는 색상 "계열"만 주는 대략값이라 서로 다른 색상이 뭉개진다(실측:
  // "카키 그레이"/"차콜 그레이" 둘 다 swatchColors=["GREY"] — groupId+color+size 매칭이
  // 이 두 색상을 같은 문서로 합쳐버려 하나가 유실됨). 정밀한 `style`(한글)을 음역해 color
  // (영문)로 쓴다 — 정확도가 swatchColors보다 훨씬 높다.
  const colorKo = (product.style || '').trim();
  const colorEn = colorKo ? romanizeName(colorKo) : (product.swatchColors && product.swatchColors[0]) || '';
  const image = product.images?.[0]?.imageLS?.url || '';
  const nameEn = romanizeName(nameKo);

  const rowBase = {
    groupId: `kolon-sport_${slugify(product.baseProductCode || product.code)}`,
    category,
    company: 'kolon-sport',
    companyKorean: '코오롱스포츠',
    nameKorean: nameKo,
    color: colorEn,
    colorKorean: colorKo,
    // ⚠ `gender`는 specs-schema.js에서 backpack/vest_pack(BACKPACK_LIKE)에만 있고, `material`은
    // tent/sleeping_bag(등 innerMaterial 계열을 쓰는 카테고리)엔 아예 없다 — 무차별로 넣으면
    // 스키마 밖 키가 생긴다(실측: gender 3734행, material tent 2행·sleeping_bag 2행 사고).
    specs: {
      ...(material && category !== 'tent' && category !== 'sleeping_bag' ? { material } : {}),
      ...(gender && (category === 'backpack' || category === 'vest_pack') ? { gender } : {}),
    },
    _source: `https://www.kolonsport.com/Product/${product.code}`,
    _detailUrl: `https://www.kolonsport.com/Product/${product.code}`,
    _productNo: product.code,
  };

  const variants = product.variantOptions && product.variantOptions.length ? product.variantOptions : [{ legacySize: '' }];
  const useTable = weightTable && weightTable.length === variants.length;
  return variants.map((v, i) => {
    const sizeRaw = (v.legacySize || '').trim();
    const hasSize = !NO_SIZE_TOKENS.has(sizeRaw.toUpperCase());
    const sizeLabel = hasSize ? sizeRaw : '';
    return {
      ...rowBase,
      name: sizeLabel ? `${nameEn} / ${sizeLabel}` : nameEn,
      nameKorean: sizeLabel ? `${rowBase.nameKorean} ${sizeLabel}` : rowBase.nameKorean,
      size: sizeLabel,
      sizeKorean: sizeLabel,
      weight: useTable ? weightTable[i] : weightG,
      imageUrl: image,
    };
  });
};

export default {
  name: 'kolon-sport',
  company: 'kolon-sport',
  companyKorean: '코오롱스포츠',
  baseUrl: 'https://www.kolonsport.com',
  defaultCategories: Object.keys(CATEGORY_MAP),
  crawl: async (browser, { categoryUrls } = {}) => {
    const categoryIds = categoryUrls || Object.keys(CATEGORY_MAP);
    const seenCodes = new Set();
    const all = [];
    for (const categoryId of categoryIds) {
      console.log(`[kolon-sport] crawling category ${categoryId}`);
      const codes = await fetchCategoryProductCodes(categoryId);
      console.log(`[kolon-sport]   ${codes.length} listing items`);
      let done = 0;
      for (const code of codes) {
        if (seenCodes.has(code)) continue;
        seenCodes.add(code);
        try {
          const product = await fetchProductDetail(code);
          all.push(...buildRowsForProduct(product, Number(categoryId)));
        } catch (e) {
          console.log(`[kolon-sport]   error on ${code}: ${e.message} — skipping`);
        }
        done += 1;
        if (done % 20 === 0) console.log(`[kolon-sport]   ${done}/${codes.length}`);
      }
    }
    return all;
  },
};

// 미스테리월(mysterywall.com) — Cafe24 자사몰(국내 전용 브랜드). puppeteer 불필요, fetch +
// 정규식 파싱만으로 리스팅/상세 전부 가능(NNEditor 상세이미지도 초기 HTML에 바로 있음, lazy
// 스크롤 불필요).
//
// ⚠ 무게/소재는 텍스트가 아니라 상세페이지의 `/web/upload/NNEditor/...` 이미지 안에
// "Size & Weight"/"Weight : NNNg" 형태로 그림으로 박혀 있다(코베아 케이스와 동일 패턴) —
// 이 어댑터는 리스팅/이름/가격/색상/사이즈/이미지 URL만 채우고, `_specImages` 배열에
// NNEditor 이미지 URL을 모아둔다. 무게는 별도로 Claude vision OCR로 채운 뒤 JSON을
// 갱신한다(CLAYMORE 세션과 동일한 2단계 워크플로우 — 자동 OCR 스크립트 없음, 사이트
// 규모가 작아 직접 확인이 더 정확함).
//
// ⚠ 변형 처리가 두 가지 메커니즘으로 나뉜다:
// 1. 색상은 상세페이지의 `<select title="색상" name="option1">` 드롭다운(같은 productNo,
//    여러 색상 row) — 실측: "스마트케이스 (X-Pac)"이 화이트/블랙/딥블루/코요테브라운 4색.
// 2. 사이즈는 별도의 독립 상품 URL/productNo로 나뉜다(같은 상품명에 "(XS)"/"(S)"/"(M)"/
//    "(L)" 접미사만 다름, 드롭다운 없음) — 실측: "디팩 3.0 (XS)"=20, "(S)"=19, "(M)"=18,
//    "(L)"=16, 전부 다른 productNo. groupId는 이 접미사를 뗀 베이스 이름으로 묶는다.
const BASE = 'https://www.mysterywall.com';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const fetchHtml = async (url) => {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
};

// ⚠ "+"를 그냥 버리면 서로 다른 상품이 같은 슬러그로 뭉개진다(실측: "사코슈 페더+"와
// "사코슈 페더"가 둘 다 "사코슈-페더-다이니마"로 충돌해 groupId가 같아짐 — "+"가 상위
// 등급(Plus) 표시라 실제로는 다른 상품). "+"는 버리기 전에 "plus"로 치환해 구분을 보존한다.
const slugify = (s) =>
  s
    .trim()
    .toLowerCase()
    .replace(/\+/g, '-plus')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣-]/g, '');

// ── 한글 로마자 표기(RR) — 국내 전용 브랜드라 영문명이 없다. 이전 세션들에서 확립한 테이블.
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

// ── 색상 한글→영문 ────────────────────────────────────────────────────
// ⚠ 색상 옵션이 순수 한글 단어(영어 색상명의 한글 음역)라 그냥 로마자 표기하면 어색하다
// (실측: "화이트"를 로마자화하면 "Hwaiteu" — 원래 English "White"의 한글 표기를 다시
// 로마자로 바꾸는 이중 변환 사고). 자주 나오는 색상은 사전으로 직접 매핑.
const COLOR_KO_EN = {
  화이트: 'White', 블랙: 'Black', 네이비: 'Navy', 베이지: 'Beige', 브라운: 'Brown',
  샌드: 'Sand', 올리브: 'Olive', 인디고: 'Indigo', 차콜: 'Charcoal', 옐로우: 'Yellow',
  노랑: 'Yellow', 레드: 'Red', 빨강: 'Red', 파랑: 'Blue', 블루: 'Blue', 딥블루: 'Deep Blue',
  멀베리: 'Mulberry', 라군: 'Lagoon', 캐롯: 'Carrot', 코요테브라운: 'Coyote Brown',
};
// ⚠ 옵션 텍스트에 재고 상태가 붙어 나오는 경우가 있다(실측: "레드 [품절]", "블랙 [일시품절]")
// — 색상 이름이 아니라 UI 상태 표시라 떼어내야 한다.
const stripColorStatusSuffix = (s) => s.replace(/\s*\[[^\]]*\]\s*$/, '').trim();
const colorToEnglish = (koreanColorRaw) => {
  const clean = stripColorStatusSuffix(koreanColorRaw);
  // ⚠ 한글 표기 뒤에 영문이 중복 병기된 경우가 있다(실측: "차콜 Charcoal", "화이트 White")
  // — 영문 부분을 그대로 쓴다.
  const bilingual = clean.match(/^[가-힣]+\s+([A-Za-z][A-Za-z\s]*)$/);
  if (bilingual) return bilingual[1].trim();
  if (COLOR_KO_EN[clean]) return COLOR_KO_EN[clean];
  return romanizeName(clean);
};

// ── 카테고리 분류 ─────────────────────────────────────────────────────
// D-PACK 계열은 배낭이 아니라 "20~30L 배낭용" 내부 정리용 파우치다(실측: 사이즈&무게 패널에
// "eXtra small (20~30L 배낭용)"라고 명시) — backpack이 아니라 pouch로 분류.
const CATEGORY_MAP = {
  56: 'pouch', 96: 'pouch', 57: 'pouch', 58: 'pouch', 61: 'pouch', // D-PACK 3.0/Dyneema/ECO/ECO SKINNY/PACKABLE
  59: 'pouch', 60: 'pouch', 78: 'pouch', 86: 'pouch', // CAMO/LITE/D-PACK 2.0/BOTTLE PACK
  50: 'shelter', 51: 'shelter', 52: 'shelter', // P SERIES/TEPEE SHELL/HEXAGON
  53: 'tarp', // TARP
  54: 'tent_acc', 55: 'tent_acc', // BUG SHIELD/SHELTER-Accessory
  71: 'backpack', 62: 'backpack', 63: 'backpack', 65: 'backpack', // BAG/5~30L/30~60L/60L+
  88: 'pouch', // SACOCHE(크로스백)
  68: 'pouch', 67: 'pouch', 69: 'pouch', // PHONE/BOTTLE/STORAGE
  46: 'pouch', // PACKING
  47: null, 48: null, // ACC./AS-PART — 상품명 키워드로 세분류
};
// "ACC."/"AS-PART"는 게이터·양말부터 텐트 스테이크·폴까지 잡다하게 섞여 있다.
const classifyAccessory = (name) => {
  if (/게이터|gaiter/i.test(name)) return 'gaiter';
  if (/양말|삭스|\bsock/i.test(name)) return 'clothing';
  if (/텐트|쉘터|타프|펙|폴(?!더)|스토퍼|와펜|스트링/i.test(name)) return 'tent_acc';
  return 'etc';
};
const classify = (categoryId, name) => CATEGORY_MAP[categoryId] || classifyAccessory(name);

// ── 리스팅 ────────────────────────────────────────────────────────────
const extractListing = (html) => {
  const items = [];
  const idRe = /id="anchorBoxId_(\d+)"/g;
  const marks = [];
  let m;
  while ((m = idRe.exec(html))) marks.push({ id: m[1], pos: m.index });
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].pos;
    const end = i + 1 < marks.length ? marks[i + 1].pos : html.length;
    const block = html.slice(start, end);
    const hrefMatch = block.match(/href="(\/product\/[^"]+)"/);
    if (!hrefMatch) continue;
    items.push({ productNo: marks[i].id, href: BASE + hrefMatch[1] });
  }
  return items;
};

const fetchCategoryProductLinks = async (categoryId) => {
  const first = await fetchHtml(`${BASE}/product/list.html?cate_no=${categoryId}`);
  const items = extractListing(first);
  const pageNums = [...first.matchAll(/[?&]page=(\d+)/g)].map((mm) => parseInt(mm[1], 10));
  const maxPage = pageNums.length ? Math.max(...pageNums) : 1;
  for (let p = 2; p <= maxPage; p += 1) {
    const html = await fetchHtml(`${BASE}/product/list.html?cate_no=${categoryId}&page=${p}`);
    items.push(...extractListing(html));
  }
  return items;
};

// ── 상세 ──────────────────────────────────────────────────────────────
// 사이트 표기 그대로의 사이즈 접미사 — 이 목록에 없는 괄호 표기(예: "(SALE)", "(코듀라)")는
// 사이즈가 아니라 소재/할인 표시라 벗기지 않는다(실측: "디팩 3.0 코듀라 (XS)"는 "코듀라"는
// 이름에 남기고 "(XS)"만 사이즈로 분리).
const SIZE_SUFFIX_RE = /\s*\((XS|S|M|L|XL|XXL|Free|프리)\)\s*$/i;

const extractDetail = (html) => {
  const h2Match = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
  let rawName = h2Match ? h2Match[1].replace(/<[^>]+>/g, '').replace(/^\[[^\]]*\]\s*/, '').trim() : '';

  const sizeMatch = rawName.match(SIZE_SUFFIX_RE);
  const size = sizeMatch ? sizeMatch[1] : '';
  const baseName = sizeMatch ? rawName.replace(SIZE_SUFFIX_RE, '').trim() : rawName;

  const priceMatch = html.match(/&#8361;([\d,]+)/);
  const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : 0;

  // ⚠ 진짜 상품 옵션(`name="option1"` 등)과 "함께 사면 좋은 상품" 추가구성 위젯
  // (`name="addproduct_option_name_NNN"`, 다른 상품을 가리킴)을 혼동하면 안 된다
  // (CLAYMORE 세션에서 이미 확인된 함정) — 정규식이 `option\d`로 정확히 끝나야 진짜 옵션.
  // ⚠ title="색상"이 아닌 select를 전부 무시하면 실제 사이즈/변형 드롭다운을 통째로
  // 놓친다(실측: "큐브 파우치(다이니마)"가 S/M 두 사이즈를 파는데(가격도 다름) 드롭다운을
  // 무시해서 사이즈 옵션 자체가 크롤 결과에서 사라졌었음, "패커블 파우치"도 S/M/L/XL
  // 4단계). 색상 아닌 축은 전부 사이즈/변형으로 취급한다("사이즈"/"폴세트"/"선택옵션" 등
  // 라벨이 달라도 우리 스키마엔 size 필드 하나뿐이라 전부 거기로).
  const colors = [];
  const sizeOptions = [];
  const stripPriceSuffix = (s) => s.replace(/\s*\([+\-]?\s*(?:&#8361;|₩)[\d,]+\)\s*$/, '').trim();
  const selectRe = /<select[^>]*title="([^"]*)"[^>]*name="option\d"[^>]*>([\s\S]*?)<\/select>/g;
  let sm;
  while ((sm = selectRe.exec(html))) {
    const isColor = /색상|컬러/.test(sm[1]);
    const target = isColor ? colors : sizeOptions;
    const optionRe = /<option value="([^"]+)"[^>]*>([^<]+)<\/option>/g;
    let om;
    while ((om = optionRe.exec(sm[2]))) {
      if (om[1] === '*' || om[1] === '**') continue;
      target.push(stripPriceSuffix(om[2].trim()));
    }
  }

  // 스펙(무게/소재) 이미지 — NNEditor 업로드 경로만(브랜드 로고/장바구니 아이콘 등 공용
  // 자산은 이 경로를 안 씀).
  const specImages = [];
  const imgRe = /<img[^>]+src="(\/web\/upload\/NNEditor\/[^"]+)"/g;
  let im;
  while ((im = imgRe.exec(html))) specImages.push(BASE + im[1]);

  const mainImgMatch = html.match(/src="(\/\/www\.mysterywall\.com\/web\/product\/big\/[^"]+)"/);
  const mainImage = mainImgMatch ? `https:${mainImgMatch[1]}` : '';

  return { baseName, size, price, colors, sizeOptions, specImages, mainImage };
};

const buildRowsForProduct = (productNo, detailUrl, detail, categoryId) => {
  const category = classify(categoryId, detail.baseName);
  const nameEn = romanizeName(detail.baseName);
  const rowBase = {
    groupId: `mystery-wall_${slugify(detail.baseName)}`,
    category,
    company: 'mystery-wall',
    companyKorean: '미스테리월',
    name: nameEn,
    nameKorean: detail.baseName,
    // 무게/소재는 상세페이지 이미지 안에만 있어 텍스트 크롤 단계에서는 못 채운다 — 별도
    // OCR 패스(mystery-wall-weight-ocr 워크플로) 후 채워 넣는다.
    weight: 0,
    specs: {},
    _source: detailUrl,
    _detailUrl: detailUrl,
    _productNo: productNo,
    _specImages: detail.specImages,
    imageUrl: detail.mainImage,
  };

  const colorAxis = detail.colors.length ? detail.colors : [null];
  // 드롭다운 사이즈/변형(sizeOptions)이 있으면 그게 URL 접미사(detail.size)보다 정밀한
  // 진짜 옵션값이다 — 실측: "큐브 파우치(다이니마)"는 URL엔 사이즈가 없지만 드롭다운에
  // S/M(가격도 다름)이 있어 이걸 우선해야 두 사이즈가 다 잡힌다.
  const sizeAxis = detail.sizeOptions.length ? detail.sizeOptions : [detail.size || null];

  const rows = [];
  for (const c of colorAxis) {
    for (const s of sizeAxis) {
      rows.push({
        ...rowBase,
        color: c ? colorToEnglish(c) : '',
        colorKorean: c ? stripColorStatusSuffix(c) : '',
        size: s ? romanizeName(s) : '',
        sizeKorean: s || '',
      });
    }
  }
  return rows;
};

export default {
  name: 'mystery-wall',
  company: 'mystery-wall',
  companyKorean: '미스테리월',
  baseUrl: BASE,
  defaultCategories: Object.keys(CATEGORY_MAP),
  crawl: async (browser, { categoryUrls } = {}) => {
    const categoryIds = categoryUrls || Object.keys(CATEGORY_MAP);
    const seen = new Set();
    const all = [];
    for (const categoryId of categoryIds) {
      console.log(`[mystery-wall] crawling category ${categoryId}`);
      const links = await fetchCategoryProductLinks(categoryId);
      console.log(`[mystery-wall]   ${links.length} listing items`);
      let done = 0;
      for (const { productNo, href } of links) {
        if (seen.has(productNo)) continue;
        seen.add(productNo);
        try {
          const html = await fetchHtml(href);
          const detail = extractDetail(html);
          all.push(...buildRowsForProduct(productNo, href, detail, Number(categoryId)));
        } catch (e) {
          console.log(`[mystery-wall]   error on ${productNo}: ${e.message} — skipping`);
        }
        done += 1;
        if (done % 20 === 0) console.log(`[mystery-wall]   ${done}/${links.length}`);
      }
    }
    return all;
  },
};

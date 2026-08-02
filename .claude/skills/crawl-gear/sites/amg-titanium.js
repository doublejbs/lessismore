// 에이엠지티타늄(AMG TITANIUM) — amg-titanium.co.kr, Cafe24 모바일 스킨. 국내 전용 티타늄 캠핑용품 브랜드.
// 리스팅: 서버렌더 HTML(m.amg-titanium.co.kr/product/list_thumb.html?cate_no=28&page=N), puppeteer 불필요
//   — plain fetch로 충분. cate_no=28("전체상품")이 마스터 목록이고, 브랜드가 나눠둔 서브카테고리
//   (25 컵/26 수저커트/27 조리도구/42 접시·케이스/46 세트)는 전체상품의 부분집합(73개 중 55개만
//   커버, 아이젠·버너·비너·텐트팩·휘슬·벨트 등 29개가 서브카테고리 밖)이라 서브카테고리별로 돌면
//   누락이 크다. 그래서 SKILL.md "완전 수집" 원칙대로 전체상품 하나를 마스터로 크롤하고
//   상품명 키워드로 33개 내부 카테고리에 재분류한다.
// 상세: /product/detail.html?product_no=N 도 서버렌더. 색상 옵션은 <select option_title="색상">
//   또는 버튼형 <ul option_style="button">로 존재(약 11/73개만 옵션 보유). 상품정보제공고시
//   테이블에는 상품명/제조사/원산지/가격만 있고 무게·소재 항목이 아예 없음 — 무게·상세 소재는
//   NNEditor 업로드 마케팅 이미지 안에만 있고(제로그램 케이스와 동일), 표준 고시 표가 아니라
//   상품마다 레이아웃이 달라(예: 저울 사진) OCR 패턴화 비용 대비 효율이 낮다고 판단해 보류.
//   _specImages만 수집해두고 weight=0/specs 일부(재질·용량은 상품명에서 파싱 가능한 것만)로 둔다.
const BASE = 'https://m.amg-titanium.co.kr';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// 상품명에 분류 단서가 전혀 없는 두 상품(종/벨) + 대형 혼합 세트 하나는 이미지 확인으로 수동 지정.
const CATEGORY_OVERRIDE = {
  46: 'etc', // PT-3001 (small) — 실제로는 진동벨(황동 종), 이름에 키워드 없음
  41: 'etc', // PT-3103 (large) — 위와 동일 라인의 큰 사이즈
  144: 'cookware_etc', // 33주년리미티드에디션 — 볼/컵/수저/국자/집게 혼합 대형 세트
};

// "전체상품"에는 AMG티타늄 자체 상품이 아니라 매장에서 함께 파는 타 브랜드(아솔로 등산화)가
// 섞여 있다 — 33개 카테고리에 신발 전용 키도 없고 크롤 대상 브랜드도 아니므로 아예 제외한다.
const isOtherBrand = (nameKorean) => /아솔로/.test(nameKorean);

// 우선순위 순서로 검사 — 위에서부터 먼저 매치되는 규칙을 채택.
const classifyCategory = (productNo, nameKorean) => {
  if (CATEGORY_OVERRIDE[productNo]) return CATEGORY_OVERRIDE[productNo];
  const n = nameKorean;
  // "케이스"로 끝나는 단독 케이스 상품(괄호 소재 설명 제외하고 판단) — 컵/코펠 등 다른 키워드가
  // 이름에 같이 있어도(예: "시에라컵 케이스") 케이스 자체가 상품이면 pouch가 맞다.
  const stripped = n.replace(/\([^)]*\)/g, '').trim();
  if (/케이스$/.test(stripped)) return 'pouch';
  if (/아이젠|체인젠/.test(n)) return 'microspikes';
  if (/가스버너|버너/.test(n)) return 'stove';
  if (/텐트팩/.test(n)) return 'tent_acc';
  if (/야전침대/.test(n)) return 'etc';
  if (/밸트|버클/.test(n)) return 'etc';
  if (/휘슬/.test(n)) return 'etc';
  if (/비너/.test(n)) return 'etc';
  // 세트 상품은 "코펠"이 포함되면 코펠(조리도구)을 대표 카테고리로 삼는다(이름 앞쪽에 오는
  // 주 품목 기준 — 코펠+싱글컵, 코펠+접시 등 혼합 세트가 다수).
  if (/코펠|반합|프라이팬|후라이팬|뒤집개|조리도구/.test(n)) return 'cookware_etc';
  if (/접시|플레이트|볼/.test(n)) return 'bowl';
  if (/머그|싱글컵|이중컵|시에라컵|소주컵/.test(n)) return 'cup';
  if (/포크|스푼|숟가락|젓가락|수저|국자/.test(n)) return 'cutlery';
  return 'etc';
};

const COLOR_KO_TO_EN = {
  블랙: 'Black', 화이트: 'White', 그레이: 'Gray', 오렌지: 'Orange', 주황: 'Orange',
  레드: 'Red', 블루: 'Blue', 네이비: 'Navy', 그린: 'Green', 옐로우: 'Yellow',
  카키: 'Khaki', 실버: 'Silver', 골드: 'Gold', 핑크: 'Pink', 퍼플: 'Purple',
  브라운: 'Brown', 베이지: 'Beige', 민트: 'Mint', 카본: 'Carbon', 아이보리: 'Ivory',
};
// 라벨 안에 사전 단어가 여러 개 섞여 있어도(예: "물고기모양그레이버클/레드웨빙") 등장 순서대로
// 전부 찾아 합친다. 순수 색상명이 아닌 복합 옵션명(버클 모양 등)의 최후 폴백.
const findColorWords = (text) => {
  const found = [];
  for (const [ko, en] of Object.entries(COLOR_KO_TO_EN)) {
    if (text.includes(ko) && !found.includes(en)) found.push(en);
  }
  return found;
};

// 로마자 음역 (Revised Romanization) — 국내 전용 브랜드라 영문명이 없는 name(영문) 필드,
// 그리고 사전에 없는 색상명의 최후 폴백에 사용. (제로그램 어댑터와 동일 구현을 이식)
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

// 발음 로마자 대신 실제 영어 단어를 쓰는 고유명사 사전 — 복합어 안에서도(예: "과일포크"의
// "포크", "등산아이젠"의 "아이젠") 부분 문자열로 걸리도록 치환 후 나머지만 로마자 음역한다.
// 긴 단어부터 검사해야 짧은 단어가 긴 단어를 깨지 않는다(예: "시에라컵"을 "시에라"+Cup으로
// 쪼개지 않도록 "컵"보다 "시에라컵"을 먼저 검사).
const TERM_EN = [
  ['시에라컵', 'Sierra Cup'],
  ['커틀러리', 'Cutlery'],
  ['야전침대', 'Cot'],
  ['두랄루민', 'Duralumin'],
  ['프라이팬', 'Frying Pan'],
  ['텐트팩', 'Tent Stake'],
  ['알루미늄', 'Aluminum'],
  ['백패킹', 'Backpacking'],
  ['에이엠지', 'AMG'],
  ['키친툴', 'Kitchen Tool'],
  ['여성용', "Women's"],
  ['미포함', 'Not Included'],
  ['스포크', 'Spork'], // "포크"(fork)보다 먼저 매치되어야 "스포크"가 "Seu Fork"로 안 쪼개짐
  ['티타늄', 'Titanium'],
  ['티탄', 'Titanium'], // 브랜드가 "티타늄"과 혼용하는 축약 표기 — 같은 재질
  ['아이젠', 'Crampon'],
  ['케이스', 'Case'],
  ['뒤집개', 'Spatula'],
  ['코펠', 'Cookset'],
  ['체인', 'Chain'],
  ['밸트', 'Belt'],
  ['비너', 'Carabiner'],
  ['집게', 'Tongs'],
  ['멀티', 'Multi'],
  ['포크', 'Fork'],
  ['버클', 'Buckle'],
  ['접시', 'Plate'],
  ['플레이트', 'Plate'],
  ['젓가락', 'Chopsticks'],
  ['숟가락', 'Spoon'],
  ['스푼', 'Spoon'],
  ['수저', 'Cutlery'],
  ['폴딩', 'Folding'],
  ['샌딩', 'Sanding'],
  ['설피', 'Snowshoe'],
  ['스크류', 'Screw'],
  ['캠핑', 'Camping'],
  ['등산', 'Hiking'],
  ['용품', 'Goods'],
  ['국자', 'Ladle'],
  ['과일', 'Fruit'],
  ['휘슬', 'Whistle'],
  ['이중', 'Double'],
  ['신형', 'New'],
  ['구형', 'Old'],
  ['머그', 'Mug'],
  ['싱글', 'Single'],
  ['포함', 'Included'],
  ['락', 'Lock'],
  ['볼', 'Bowl'],
  ['컵', 'Cup'],
  ['스쿠버', 'Scuba'],
  ['메쉬', 'Mesh'],
  ['광목', 'Cotton Canvas'],
  ['세트', 'Set'],
  ['고정형', 'Fixed'],
  ['도심형', 'Urban'],
  ['증정', 'Gift'],
].sort((a, b) => b[0].length - a[0].length);

const substituteKnownTerms = (koreanText) => {
  let out = koreanText;
  for (const [ko, en] of TERM_EN) out = out.split(ko).join(` ${en} `);
  return out
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
};

const romanizeName = (koreanText) =>
  substituteKnownTerms(koreanText)
    .split(/(\s+)/)
    .map((t) => (/\s+/.test(t) ? t : romanizeToken(t)))
    .join('');

const colorToEnglish = (colorKorean) => {
  const words = findColorWords(colorKorean);
  if (words.length) return words.join('/');
  return romanizeName(colorKorean);
};

// 괄호 안 내용을 지우지 않는다 — 이 브랜드는 모델번호(#18/#19)·소재(광목/메쉬)·규격(6Ø/5Ø) 같은
// 유일한 구분자가 괄호 안에만 있는 경우가 많아, 지우면 서로 다른 상품이 같은 groupId로
// 충돌한다(예: "티타늄 비너(#19)"와 "티타늄 비너(#18)").
const slugify = (s) =>
  s
    .trim()
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}()-]/gu, '')
    .toLowerCase();

// "340ml" / "1.7L" / "1250ML" → ml 숫자. capacity 스펙 필드(cup/bowl/cookware_etc)는 ml 단위.
const extractCapacityMl = (name) => {
  const m = name.match(/(\d+(?:\.\d+)?)\s*(ml|l)\b/i);
  if (!m) return 0;
  const val = parseFloat(m[1]);
  return /l/i.test(m[2]) && !/ml/i.test(m[2]) ? Math.round(val * 1000) : Math.round(val);
};

const extractMaterial = (name) => {
  if (/두랄루민/.test(name)) return '두랄루민';
  if (/알루미늄/.test(name)) return '알루미늄';
  if (/티타늄|티탄/.test(name)) return '티타늄';
  return '';
};

const isSetProduct = (name) => /SET|세트/i.test(name);

const fetchHtml = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  return res.text();
};

const getTotalPages = (html) => {
  const m = html.match(/more_total_page">(\d+)</);
  return m ? parseInt(m[1], 10) : 1;
};

const parseListingPage = (html) => {
  const idx = html.indexOf('$moreview');
  if (idx === -1) return [];
  const tail = html.slice(idx);
  const items = [];
  const re = /<li class="xans-record-">([\s\S]*?)<\/li>\s*(?=<li class="xans-record-">|<\/ul>)/g;
  let m;
  while ((m = re.exec(tail))) {
    const block = m[1];
    const hrefM = block.match(/href="(\/product\/[^"]+\/(\d+)\/category\/\d+\/display\/\d+\/)"/);
    if (!hrefM) continue;
    const nameM = block.match(/class="name[^>]*>\s*<a[^>]*>([^<]+)</);
    const imgM = block.match(/<img[^>]*src="([^"]+)"/);
    let imageUrl = imgM ? imgM[1] : '';
    if (imageUrl.startsWith('//')) imageUrl = `https:${imageUrl}`;
    else if (imageUrl.startsWith('/')) imageUrl = `${BASE}${imageUrl}`;
    items.push({
      productNo: hrefM[2],
      href: hrefM[1],
      nameKorean: nameM ? nameM[1].trim() : '',
      imageUrl,
    });
  }
  return items;
};

const fetchAllListing = async (cateNo) => {
  const first = await fetchHtml(`${BASE}/product/list_thumb.html?cate_no=${cateNo}&page=1`);
  const total = getTotalPages(first);
  const all = parseListingPage(first);
  for (let p = 2; p <= total; p += 1) {
    const html = await fetchHtml(`${BASE}/product/list_thumb.html?cate_no=${cateNo}&page=${p}`);
    all.push(...parseListingPage(html));
  }
  const seen = new Set();
  return all.filter((it) => (seen.has(it.productNo) ? false : (seen.add(it.productNo), true)));
};

// <select option_title="X"><option value="*|**">...</option><option value="P...">라벨</option></select>
const parseSelectOptions = (html) => {
  const out = [];
  const re = /<select[^>]*option_title="([^"]*)"[^>]*>([\s\S]*?)<\/select>/g;
  let m;
  while ((m = re.exec(html))) {
    const title = m[1];
    const opts = [...m[2].matchAll(/<option value="([^"]+)"[^>]*>([^<]*)<\/option>/g)]
      .filter((o) => o[1] !== '*' && o[1] !== '**')
      .map((o) => o[2].trim());
    if (opts.length) out.push({ title, style: 'select', labels: opts });
  }
  return out;
};

// 버튼형 옵션: <ul ...option_style="button"...option_title="X"...><li title="라벨">...
// (실제 마크업에서 option_title이 option_style보다 앞에 오는 경우가 있어 속성 순서에 무관하게 매칭)
const parseButtonOptions = (html) => {
  const out = [];
  const re = /<ul((?:(?!<\/?ul)[\s\S])*?option_style="button"(?:(?!<\/?ul)[\s\S])*?)>([\s\S]*?)<\/ul>/g;
  let m;
  while ((m = re.exec(html))) {
    const titleM = m[1].match(/option_title="([^"]*)"/);
    const title = titleM ? titleM[1] : '';
    const labels = [...m[2].matchAll(/title="([^"]*)"/g)].map((o) => o[1].trim());
    if (labels.length) out.push({ title, style: 'button', labels });
  }
  return out;
};

// NNEditor 업로드 상세 이미지(마케팅 이미지 안에 무게 등 표기 — 추후 OCR 후처리용으로만 수집).
// 상세 이미지 호스팅이 상품마다 제각각이다 — 최근 상품은 /web/upload/NNEditor/...,
// 예전 상품은 /web/upload/prod/...(도메인도 m. 없이 //amg-titanium.co.kr/...), 더 오래된
// 상품은 아예 다른 CDN(gi.esmplus.com, 지마켓/옥션에서 흔한 ESM PLUS 이미지 호스팅)을 쓴다.
// 도메인/경로로 걸지 않고 #prdDetailContent ~ #prdInfo 구간(상세 설명 영역)의 이미지를 전부
// 잡고, 흔한 아이콘류(gif)만 제외한다.
const parseSpecImages = (html) => {
  const start = html.indexOf('id="prdDetailContent"');
  if (start === -1) return [];
  const endRel = html.slice(start).search(/id="prdInfo"/);
  const scope = endRel === -1 ? html.slice(start) : html.slice(start, start + endRel);
  const imgs = new Set();
  for (const m of scope.matchAll(/(?:src|ec-data-src)=["']([^"']+\.(?:jpg|jpeg|png))["']/gi)) {
    let u = m[1].split('?')[0];
    if (u.startsWith('//')) u = `https:${u}`;
    else if (u.startsWith('/')) u = `${BASE}${u}`;
    imgs.add(u);
  }
  return [...imgs];
};

const fetchDetail = async (href) => {
  const html = await fetchHtml(`${BASE}${href}`);
  const ogTitleM = html.match(/property="og:title" content="([^"]*)"/);
  const ogImageM = html.match(/property="og:image" content="([^"]*)"/);
  const options = [...parseSelectOptions(html), ...parseButtonOptions(html)];
  return {
    nameKorean: ogTitleM ? ogTitleM[1].trim() : '',
    imageUrl: ogImageM ? ogImageM[1].trim() : '',
    options,
    specImages: parseSpecImages(html),
  };
};

// 옵션 라벨 하나를 (color, size) 로 분해.
//  - "오렌지(230-250mm)" 처럼 뒤에 mm 범위가 괄호로 붙으면 색상+사이즈 복합.
//  - "…버클/…웨빙/사이즈M" 처럼 "/사이즈X" 접미사가 있으면 그 앞부분 전체가 colorKorean(복합
//    옵션명), 뒷부분이 size.
//  - 그 외엔 라벨 전체가 색상.
const splitOptionLabel = (label) => {
  const cleaned = label.replace(/\s*\[품절\]\s*$/, '').trim();
  const mmRange = cleaned.match(/^(.+?)\((\d+[-~]\d+\s*mm)\)$/);
  if (mmRange) return { colorKorean: mmRange[1].trim(), size: mmRange[2].replace(/\s+/g, ''), sizeKorean: mmRange[2].replace(/\s+/g, '') };
  const sizeSuffix = cleaned.match(/^(.+)\/사이즈([SML])$/);
  if (sizeSuffix) return { colorKorean: sizeSuffix[1].trim(), size: sizeSuffix[2], sizeKorean: `사이즈${sizeSuffix[2]}` };
  return { colorKorean: cleaned, size: '', sizeKorean: '' };
};

// company/companyKorean에 이미 브랜드명이 있으므로 상품명 맨 앞에 반복되는 브랜드 표기는
// 제거한다("AMG티타늄 티탄젠..." → "티탄젠...", "에이엠지티타늄 싱글컵..." → "싱글컵...").
// 끝부분에 붙는 "...캠핑 백패킹 AMG TITANIUM"류는 건드리지 않는다(요청 범위가 "앞단"만).
const stripBrandPrefix = (name) =>
  name.replace(/^(에이엠지티타늄|AMG\s*티타늄|AMG\s*TITANIUM|AMG\s*TITANUIM)\s*/i, '').trim();

const buildRows = (item, category, detail) => {
  const nameKorean = stripBrandPrefix(detail.nameKorean || item.nameKorean);
  const imageUrl = detail.imageUrl || item.imageUrl;
  const material = extractMaterial(nameKorean);
  const capacityMl = extractCapacityMl(nameKorean);
  const specs = {};
  if (material) specs.material = material;
  if (['cup', 'bowl', 'cookware_etc'].includes(category) && capacityMl) specs.capacity = capacityMl;
  if (['cup', 'bowl', 'cookware_etc', 'cutlery'].includes(category) && isSetProduct(nameKorean)) specs.isSet = true;

  const common = {
    groupId: `amg-titanium_${slugify(nameKorean)}`,
    category,
    company: 'amg-titanium',
    companyKorean: '에이엠지티타늄',
    name: romanizeName(nameKorean),
    nameKorean,
    weight: 0,
    specs,
    _source: `${BASE}/product/list_thumb.html?cate_no=28#${category}`,
    _detailUrl: `${BASE}${item.href}`,
    _productNo: item.productNo,
    _specImages: detail.specImages,
  };

  // 옵션이 없으면 단일 행.
  if (!detail.options.length) {
    return [{ ...common, color: '', colorKorean: '', size: '', sizeKorean: '', imageUrl }];
  }

  // option_title 자체가 색상명(아솔로 등산화 케이스 — 163/164)이면 값들은 전부 사이즈(신발 mm).
  const group = detail.options[0];
  if (COLOR_KO_TO_EN[group.title]) {
    const colorKorean = group.title;
    const color = COLOR_KO_TO_EN[colorKorean];
    return group.labels.map((sizeMm) => ({
      ...common,
      color,
      colorKorean,
      size: `${sizeMm}mm`,
      sizeKorean: `${sizeMm}mm`,
      imageUrl,
    }));
  }

  const optionRows = detail.options.flatMap((g) =>
    g.labels.map((label) => {
      const { colorKorean, size, sizeKorean } = splitOptionLabel(label);
      return { colorKorean, color: colorToEnglish(colorKorean), size, sizeKorean };
    })
  );
  // 색상 사전 매칭이 여러 라벨을 같은 (color,size)로 뭉갤 수 있다(예: "물고기모양레드버클/
  // 레드웨빙"과 "레드버클/레드웨빙"이 둘 다 "Red"로만 남는 경우) — push.js의 groupId+color+size
  // 매치 규칙이 이 둘을 같은 변형으로 오인해 하나가 다른 하나를 덮어쓰게 된다. (color,size)가
  // 겹치는 라벨만 색상 전체를 로마자 음역해 유일하게 만든다(colorKorean은 원문 그대로 유지).
  const dupKey = (r) => `${r.color} ${r.size}`;
  const counts = {};
  for (const r of optionRows) counts[dupKey(r)] = (counts[dupKey(r)] || 0) + 1;
  return optionRows.map((r) => ({
    ...common,
    color: counts[dupKey(r)] > 1 ? romanizeName(r.colorKorean) : r.color,
    colorKorean: r.colorKorean,
    size: r.size,
    sizeKorean: r.sizeKorean,
    imageUrl,
  }));
};

export default {
  name: 'amg-titanium',
  company: 'amg-titanium',
  companyKorean: '에이엠지티타늄',
  baseUrl: BASE,
  defaultCategories: ['28'],
  crawl: async (_browser, { categoryUrls, withWeight = true } = {}) => {
    const cateNo = (categoryUrls?.[0] ?? '28').toString().replace(/^.*cate_no=/, '');
    console.log(`[amg-titanium] listing cate_no=${cateNo}`);
    const items = await fetchAllListing(cateNo);
    console.log(`[amg-titanium] ${items.length} unique products`);

    const all = [];
    let skipped = 0;
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (isOtherBrand(item.nameKorean)) {
        skipped += 1;
        continue;
      }
      const detail = withWeight
        ? await fetchDetail(item.href)
        : { nameKorean: item.nameKorean, imageUrl: '', options: [], specImages: [] };
      const category = classifyCategory(Number(item.productNo), detail.nameKorean || item.nameKorean);
      all.push(...buildRows(item, category, detail));
      if ((i + 1) % 10 === 0) console.log(`[amg-titanium]   detail ${i + 1}/${items.length}`);
    }
    if (skipped) console.log(`[amg-titanium] skipped ${skipped} non-AMG products (아솔로 등산화 등)`);
    return all;
  },
};

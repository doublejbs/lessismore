// 에버뉴(evernew-global.com) — 일본 브랜드 글로벌(영문) 정적 HTML 카탈로그 사이트.
// puppeteer/OCR 불필요, 순수 fetch + 정규식.
//
// 구조:
//   카테고리 리스트: /products/<cat>/index.html
//     → <div class="item">…<a href="<CODE>.html" class="iframe_box">
//          <figure><img src="…/item-<CODE>.jpg" alt="상품명"></figure><h3>상품명</h3>
//          <dl class="specDetail"><dt><CODE><span>가격円</span></dt></dl>
//   개별 상세: /products/<cat>/<CODE>.html
//     → <dd class="spec"><span class="fb">Weight：</span>51g(1.79oz) | <span class="fb">Material：</span>… | …</dd>
//
// ⚠ 글로벌 사이트라 상품명이 영문뿐이다(한글명 없음). name=영문, nameKorean도 영문(불가피 —
//    스노우피크 영문전용 상품과 동일 케이스). 가격은 円(엔)이라 스키마에 없어 무시.
const BASE = 'https://www.evernew-global.com';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const fetchHtml = async (url) => {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
      if (r.ok) return r.text();
      if (r.status === 404) return null;
    } catch (e) {
      /* 재시도 */
    }
    await new Promise((res) => setTimeout(res, 300 * (i + 1)));
  }
  return null;
};

const slugify = (s) =>
  (s || '').trim().toLowerCase().replace(/\+/g, '-plus').replace(/\s+/g, '-').replace(/[^a-z0-9가-힣-]/g, '');

const CATEGORIES = ['titanium', 'alminium', 'cookware', 'stove', 'accessories', 'sleepingsystem', 'trekking-pole', 'watercarry'];

// ── 카테고리 + 상품명 → 내부 카테고리 ──
const classifyCookware = (n) => {
  // ⚠ 요리도구를 언급해도 케이스/백/색은 수납용품(pouch), 뚜껑/핸들단독/후크/체인/브러쉬/클리너/
  //    트리벳은 부속(etc)이다. 단 "Deep Pot ... Handle"(손잡이 달린 냄비)·"Sierra Cup Fold Handle"
  //    (컵)처럼 handle이 기능어인 경우는 아래 요리도구 분류로 넘어가게 ^handle만 부속 처리.
  if (/\b(case|bag|sack|cover|pouch)\b|neoprene|np\s*case/i.test(n)) return 'pouch';
  if (/\btable\b/i.test(n)) return 'table';
  if (/trowel/i.test(n)) return 'shovel';
  if (/\b(lid|hook|chain|brush|cleaner|trivet|tongs|clip)\b/i.test(n)) return 'etc';
  if (/^handle\b/i.test(n.trim())) return 'etc';
  if (/mug|cup|tibi|sake|gubi|zarazara|tumbler|잔/i.test(n)) return 'cup';
  if (/bottle|flask|canteen/i.test(n)) return 'bottle';
  if (/bowl|plate|dish|tray|sara/i.test(n)) return 'bowl';
  if (/spork|spoon|fork|chopstick|knife|cutlery|hashi/i.test(n)) return 'cutlery';
  return 'cookware_etc'; // pot/pan/cooker/kettle/frypan 등
};
const classify = (cat, name) => {
  const n = name || '';
  switch (cat) {
    case 'titanium':
    case 'alminium':
    case 'cookware':
      return classifyCookware(n);
    case 'stove':
      if (/torch/i.test(n)) return 'torch';
      return 'stove';
    case 'sleepingsystem':
      if (/pillow/i.test(n)) return 'pillow';
      if (/sleeping\s*bag|quilt|down\s*bag/i.test(n)) return 'sleeping_bag';
      return 'mat'; // mat/pad 기본
    case 'trekking-pole':
      return 'trekking_pole';
    case 'watercarry':
      if (/bag|bladder|reservoir|carry|pack|pouch|sack/i.test(n)) return 'pouch';
      return 'bottle'; // bottle/flask 기본
    case 'accessories':
      if (/bag|pouch|case|sack|stuff|wallet|holder/i.test(n)) return 'pouch';
      if (/\btable\b/i.test(n)) return 'table';
      if (/trowel|shovel|scoop/i.test(n)) return 'shovel';
      if (/tenugui|towel|수건/i.test(n)) return 'towel';
      if (/pole|p-bo|stake|peg/i.test(n)) return 'tent_acc';
      return 'etc';
    default:
      return 'etc';
  }
};

// ── 리스팅 ──
const extractListing = (html, cat) => {
  const items = [];
  const re = /<a href="([A-Za-z0-9-]+)\.html" class="iframe_box">([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html))) {
    const code = m[1];
    const inner = m[2];
    const h3 = inner.match(/<h3>([\s\S]*?)<\/h3>/);
    const alt = inner.match(/<img[^>]+alt="([^"]*)"/);
    const imgSrc = inner.match(/<img[^>]+src="([^"]+item-[^"]+)"/);
    const name = (h3 ? h3[1] : alt ? alt[1] : '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const imageUrl = imgSrc ? new URL(imgSrc[1], `${BASE}/products/${cat}/`).href : `${BASE}/assets/images/${cat}/item-${code}.jpg`;
    items.push({ code, name, imageUrl, detailUrl: `${BASE}/products/${cat}/${code}.html` });
  }
  return items;
};

// ── 상세 스펙 파싱 ──
const parseSpec = (html) => {
  const spec = {};
  const dd = html.match(/<dd class="spec">([\s\S]*?)<\/dd>/);
  if (!dd) return spec;
  const parts = dd[1]
    .replace(/<span class="fb">/g, '')
    .replace(/<\/span>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .split(/[|]/);
  //  는 각 라벨 시작 마커. "Label：value" 형태로 재구성.
  let curLabel = null;
  for (const raw of dd[1].split('<span class="fb">')) {
    const t = raw.replace(/<[^>]+>/g, '').replace(/\s*\|\s*$/, '').trim();
    if (!t) continue;
    const mm = t.match(/^([^：:]+)[：:]\s*([\s\S]*)$/);
    if (mm) {
      const label = mm[1].replace(/\s+/g, ' ').trim();
      // 값 끝의 라벨 구분자(|)·잘린 구분기호(/ 、 ,) 정리.
      const value = mm[2]
        .replace(/\s*\|\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[\s/、,;]+$/g, '')
        .trim();
      if (label) spec[label] = value;
    }
  }
  return spec;
};

const findSpec = (spec, keys) => {
  for (const k of Object.keys(spec)) if (keys.some((kk) => k.toLowerCase().includes(kk.toLowerCase()))) return spec[k];
  return '';
};

const parseWeightG = (spec) => {
  const raw = findSpec(spec, ['weight']);
  const m = raw.match(/(\d[\d,]*(?:\.\d+)?)\s*g\b/i); // "51g(1.79oz)" → 51 (oz 무시)
  if (!m) {
    const mk = raw.match(/(\d[\d,]*(?:\.\d+)?)\s*kg\b/i);
    if (mk) return Math.round(parseFloat(mk[1].replace(/,/g, '')) * 1000);
    return 0;
  }
  return Math.round(parseFloat(m[1].replace(/,/g, '')));
};

const buildSpecs = (category, spec) => {
  const s = {};
  const material = findSpec(spec, ['material', '材質']);
  const capacity = findSpec(spec, ['capacity', '容量']);
  const size = findSpec(spec, ['size', 'height', 'length', '寸法']);
  const setMat = () => {
    if (material) s.material = material;
  };
  switch (category) {
    case 'cup':
    case 'bowl':
    case 'bottle':
    case 'cookware_etc':
      setMat();
      if (capacity) s.capacity = capacity;
      break;
    case 'cutlery':
      setMat();
      break;
    case 'stove':
    case 'torch':
      setMat();
      break;
    case 'mat':
      setMat();
      if (findSpec(spec, ['thickness'])) s.thickness = findSpec(spec, ['thickness']);
      if (size) s.openSize = size;
      break;
    case 'sleeping_bag':
      if (material) s.fillMaterial = /down/i.test(material) ? 'down' : 'synthetic';
      break;
    case 'trekking_pole':
      setMat();
      break;
    case 'table': // 스키마: topMaterial/frameMaterial/maxLoad/packedSize (material·size 아님)
      if (material) s.topMaterial = material;
      break;
    case 'pillow':
    case 'pouch':
      setMat();
      if (capacity) s.capacity = capacity;
      break;
    default:
      setMat();
      if (size) s.size = size;
      break;
  }
  return s;
};

const buildRow = (cat, item, spec) => {
  const category = classify(cat, item.name);
  const name = item.name;
  return {
    groupId: `evernew_${item.code.toLowerCase()}`,
    category,
    company: 'evernew',
    companyKorean: '에버뉴',
    name,
    nameKorean: name, // ⚠ 글로벌 사이트 영문명만 존재 — 한글명 없음(불가피)
    color: '',
    colorKorean: '',
    size: '',
    sizeKorean: '',
    weight: parseWeightG(spec),
    specs: buildSpecs(category, spec),
    imageUrl: item.imageUrl,
    _detailUrl: item.detailUrl,
    _source: item.detailUrl,
    _code: item.code,
  };
};

export default {
  name: 'evernew',
  company: 'evernew',
  companyKorean: '에버뉴',
  baseUrl: BASE,
  defaultCategories: CATEGORIES,
  crawl: async (browser, { categoryUrls } = {}) => {
    const cats = categoryUrls && categoryUrls.length ? categoryUrls : CATEGORIES;
    const seen = new Set();
    const rows = [];
    for (const cat of cats) {
      const listHtml = await fetchHtml(`${BASE}/products/${cat}/index.html`);
      if (!listHtml) {
        console.log(`[evernew] ${cat} index 없음`);
        continue;
      }
      const items = extractListing(listHtml, cat);
      let n = 0;
      for (const item of items) {
        if (seen.has(item.code)) continue;
        seen.add(item.code);
        const detailHtml = await fetchHtml(item.detailUrl);
        const spec = detailHtml ? parseSpec(detailHtml) : {};
        rows.push(buildRow(cat, item, spec));
        n += 1;
        if (n % 20 === 0) console.log(`[evernew]   ${cat} ${n}/${items.length}`);
      }
      console.log(`[evernew] ${cat} 신규 ${n}개 (누적 ${rows.length}행)`);
    }
    return rows;
  },
};

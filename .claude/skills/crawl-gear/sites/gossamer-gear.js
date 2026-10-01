// 고싸머기어(gossamergear.com) — Shopify 스토어(미국 UL 백패킹 브랜드).
// 리스팅/변형/이미지는 products.json API, 무게는 상품페이지의 서버렌더 <legend> 스펙에서.
//
// ⚠ 무게: Shopify variants[].grams는 배송무게라 부정확. 실제 무게는 상품페이지
//    `<legend id="Weight-template--…"><span>Weight:</span> <span>33.4 oz / 946 g</span></legend>`
//    에 oz/g 병기로 서버렌더돼 있다(curl 가능) → g값 추출. 없으면(의류·소모품) 0.
// ⚠ 미국 브랜드라 상품명 영문뿐 → nameKorean도 영문(폴백). 한글화는 별도 단계(KR 유통사 매칭/음역).
//    가격은 USD라 스키마에 없어 무시.
// ⚠ 변형: 옵션축 Color→color, Size계열(Size/Pack Size/Hipbelt Size/…(Size))→size로 전개,
//    그 외 축(Hipbelt/Fabric/Style/Type/Section)은 접는다((color,size) dedup).
import { execFileSync } from 'node:child_process';

const BASE = 'https://www.gossamergear.com';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const sleep = (ms) => execFileSync('sleep', [String(ms / 1000)]);
// Shopify+Cloudflare는 종종 native fetch의 TLS 지문을 막는다 → curl 위임(스킬 관례).
// ⚠ rapid 요청은 Cloudflare 챌린지 페이지를 반환한다(길이는 크지만 실제 상품 콘텐츠 없음 → 초기
//    크롤 무게율 40%였음). marker(실제 페이지에만 있는 문자열)를 확인해 진짜 페이지 받을 때까지 재시도.
const curlGet = (url, marker = null, retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      const out = execFileSync('curl', ['-s', '--compressed', '-A', UA, url], { maxBuffer: 64 * 1024 * 1024, encoding: 'utf-8' });
      if (out && out.length > 500 && (!marker || out.includes(marker))) return out;
    } catch (e) {
      /* 재시도 */
    }
    sleep(500 * (i + 1));
  }
  return '';
};
const fetchJson = (url) => {
  const t = curlGet(url);
  try {
    return JSON.parse(t);
  } catch (e) {
    return null;
  }
};

// ── 카테고리 ──
const classifyByName = (n, tags = '') => {
  const s = `${n} ${tags}`;
  // ⚠ 스테이크/펙/가이라인은 tags에 shelter가 있어도 tent_acc(이름 기준, shelter보다 먼저).
  if (/\bstake\b|\bpeg\b|guyline|guy ?line/i.test(n)) return 'tent_acc';
  if (/tarp/i.test(n)) return 'tarp';
  if (/tent|shelter|bivy|the one\b|the two\b|dcf shelter/i.test(n)) return 'shelter'; // 이름 기준(tags 오염 방지)
  if (/sleeping bag|quilt/i.test(s)) return 'sleeping_bag';
  if (/trowel|shovel|scoop/i.test(s)) return 'shovel'; // ⚠ "Backpacking Trowel"이 /pack/에 걸리기 전에
  // 헤드랜턴 vs 조명(§3-1 핸드오프 규칙): 헤드+램프/토치, 또는 Nitecore NU/HC 모델은 headlamp.
  if (/head\s*(lamp|torch)|headlamp|headlight/i.test(s) || /nitecore.*\b(?:NU|HC)\s?\d/i.test(s)) return 'headlamp';
  if (/flashlight|\blumen\b|lantern/i.test(s)) return 'lighting';
  if (/towel/i.test(s)) return 'towel'; // "Little Towel"이 다른 것에 안 걸리게 앞으로
  if (/foam ?pad|sleeping ?pad|sitlight|thinlight|\bpad\b/i.test(s)) return 'mat';
  if (/pillow/i.test(s)) return 'pillow';
  if (/trekking pole|hiking pole|\bpole\b/i.test(s)) return 'trekking_pole';
  if (/stove/i.test(s)) return 'stove';
  if (/spork|spoon|fork|utensil|cutlery|\bknife\b/i.test(s)) return 'cutlery'; // knife 추가
  if (/mug\b|cup\b/i.test(s)) return 'cup'; // 머그/컵은 cookware보다 먼저(§3-3)
  // 조리 본체(§3-3): 쿡셋/쿠커/팟/팬/케틀/스킬렛은 cookware. canister(보관통)는 팟 아님 → 아래 cookware_etc.
  if (/cook(?:set|er|ware)?|kettle|\bpot\b|\bpan\b|skillet|griddle/i.test(s)) return 'cookware';
  if (/canister/i.test(s)) return 'cookware_etc';
  if (/bottle|flask|hydration|reservoir|water filter|squeeze/i.test(s)) return 'bottle';
  if (/umbrella/i.test(s)) return 'etc';
  if (/rain ?cover|pack cover|liner/i.test(s)) return 'backpack_cover';
  if (/cube|pouch|stuff sack|ditty|wallet|case|organizer|pocket|duffel/i.test(s)) return 'pouch';
  if (/\bpack\b|backpack|daypack|rucksack|sling/i.test(n)) return 'backpack'; // ⚠ 이름만(태그 아님)·단어경계
  if (/jacket|shirt|hoodie|hat|cap|beanie|sock|glove|apparel|tee|shorts|pants/i.test(s)) return 'clothing';
  if (/stake|guyline|guy line|cord|hardware|repair|buckle|clip|strap/i.test(s)) return 'tent_acc';
  if (/\bbag\b/i.test(n)) return 'pouch';
  return 'etc';
};
const classify = (productType, name, tags) => {
  const t = (productType || '').toLowerCase();
  const nt = `${name} ${tags}`;
  switch (t) {
    case 'backpacks':
      return /liner|cover/i.test(nt) ? 'backpack_cover' : 'backpack';
    case 'backpack accessory':
      if (/foam ?pad|sleeping ?pad|sitlight|thinlight/i.test(nt)) return 'mat'; // SitLight 등 싯패드
      if (/blackbelt|fanny|waist ?pack|hip ?pack/i.test(nt)) return 'backpack'; // 힙팩류
      if (/rain ?cover|pack cover|liner|jacket/i.test(nt)) return 'backpack_cover';
      if (/pocket|pouch|cube|stuff sack|ditty|wallet|organizer|\bsacks?\b|feedbag|snack/i.test(nt)) return 'pouch';
      // 소형 팩(Sidequest 등): 태그가 daypacks/backpacks이고 이름이 부속(포켓/스트랩/벨트)이 아니면 backpack
      if (/\b(daypacks?|backpacks?)\b/i.test(tags) && !/pocket|strap|belt|frame|stay|sternum|hipbelt/i.test(name)) return 'backpack';
      if (/hipbelt|frame|stay|sternum/i.test(nt)) return 'backpack';
      return 'etc';
    case 'shelters':
      // ⚠ Shelters product_type에 스테이크/펙/주머니/풋프린트가 섞임 → tent_acc로.
      if (/stake|\bpeg\b|footprint|guyline|\bbag\b|pole set/i.test(nt)) return 'tent_acc';
      if (/tarp/i.test(nt)) return 'tarp';
      return 'shelter';
    case 'shelter accessory':
      return 'tent_acc';
    case 'cooking + hydration':
    case 'cooking':
      if (/mug\b|cup\b/i.test(nt)) return 'cup';
      if (/bottle|flask|hydration|reservoir|filter|squeeze/i.test(nt)) return 'bottle';
      if (/spork|spoon|fork|utensil/i.test(nt)) return 'cutlery';
      if (/stove/i.test(nt)) return 'stove';
      if (/canister/i.test(nt)) return 'cookware_etc'; // 보관통은 팟 아님
      if (/cook(?:set|er|ware)?|kettle|\bpot\b|\bpan\b|skillet/i.test(nt)) return 'cookware'; // 조리 본체(§3-3)
      return 'cookware_etc';
    case 'hydration':
      return 'bottle';
    case 'packing cube':
    case 'duffel bag':
      return 'pouch';
    case 'trekking poles':
    case 'trekking pole repair':
      return 'trekking_pole';
    case 'foam pads':
      return 'mat';
    case 'umbrella':
      return 'etc';
    case 'apparel + merch': {
      if (/sticker|decal|patch\b|pin\b|magnet|keychain|book|slogan/i.test(nt)) return 'etc';
      const c = classifyByName(nt);
      return /clothing|towel|etc/.test(c) ? (c === 'etc' ? 'clothing' : c) : 'clothing';
    }
    case 'hygiene + first aid':
    case 'hardware + repair':
    case 'repair':
      return classifyByName(nt) === 'tent_acc' ? 'tent_acc' : 'etc';
    default: // '' / accessories 등 — 이름으로 분류
      return classifyByName(nt);
  }
};

// ── 무게: 상품페이지 <legend id="Weight-template…"> ──
const fetchWeightG = (handle) => {
  // 모든 상품페이지에 Weight-template legend가 있다(값이 비어도) → 마커로 실제 페이지 확보.
  const html = curlGet(`${BASE}/products/${handle}`, 'Weight-template');
  if (!html) return 0;
  const m = html.match(/id="Weight-template[^"]*"[^>]*>([\s\S]{0,220}?)<\/legend>/);
  if (!m) return 0;
  const txt = m[1].replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
  // "33.4 oz / 946 g", "0.24 oz / 6.8 g", "29.8 oz total / 845 g" → g값
  const g = txt.match(/([\d.,]+)\s*g\b/);
  if (g) return Math.round(parseFloat(g[1].replace(/,/g, '')));
  const kg = txt.match(/([\d.,]+)\s*kg\b/);
  if (kg) return Math.round(parseFloat(kg[1].replace(/,/g, '')) * 1000);
  return 0;
};

// ── 변형 축 판별 ──
const isColorAxis = (name) => /color/i.test(name);
const isSizeAxis = (name) => /\bsize\b/i.test(name) || /(size)/i.test(name);
const optIndexFor = (options, pred) => {
  const i = options.findIndex((o) => pred(o.name));
  return i >= 0 ? i + 1 : 0; // option1/2/3 (1-based), 0=없음
};

// ⚠ 스키마 volume/capacity 는 type:number(단위 L은 앱이 붙임) → 숫자만 반환(단위 문자 금지).
const volumeFromTitle = (title) => {
  const m = title.match(/(\d+(?:\.\d+)?)\s*L\b/i) || title.match(/\b(\d{2,3})\b(?!\s*(?:oz|g|cm|mm))/);
  return m ? m[1] : '';
};

const buildSpecs = (category, title, tags) => {
  const s = {};
  const vol = volumeFromTitle(title);
  if (vol) {
    // ⚠ 스키마: backpack/backpack_cover는 volume, pouch·용기·쉘터는 capacity.
    if (/^(backpack|backpack_cover|vest_pack)$/.test(category)) s.volume = vol;
    else if (/^(pouch|tent|tarp|shelter|cup|bowl|bottle|cookware|cookware_etc)$/.test(category)) s.capacity = vol;
  }
  if (/dcf|dyneema/i.test(`${title} ${tags}`)) {
    // ⚠ 쉘터류는 material 아님 flyMaterial.
    if (/^(tent|tarp|shelter)$/.test(category)) s.flyMaterial = 'Dyneema (DCF)';
    else if (/^(backpack|backpack_cover|mat|pouch|cookware|cookware_etc|cup|bowl|bottle|cutlery|stove|clothing|gloves|gaiter|chair|trekking_pole|tent_acc|etc|towel)$/.test(category)) s.material = 'Dyneema (DCF)';
  }
  return s;
};

const slugify = (s) => (s || '').trim().toLowerCase().replace(/\+/g, '-plus').replace(/\s+/g, '-').replace(/[^a-z0-9가-힣-]/g, '');

const buildRows = (p, weight) => {
  const name = (p.title || '').trim();
  const category = classify(p.product_type, name, (p.tags || []).join(' '));
  const specs = buildSpecs(category, name, (p.tags || []).join(' '));
  const ci = optIndexFor(p.options, isColorAxis);
  const si = optIndexFor(p.options, isSizeAxis);
  const groupId = `gossamer-gear_${slugify(name) || p.handle}`;
  const mainImage = (p.images && p.images[0] && `https:${p.images[0].src}`.replace(/^https:https:/, 'https:')) || '';
  // 색상별 이미지 매핑
  const colorImg = {};
  for (const v of p.variants || []) {
    const col = ci ? v[`option${ci}`] : '';
    if (col && v.featured_image && !colorImg[col]) colorImg[col] = `https:${v.featured_image.src}`.replace(/^https:https:/, 'https:');
  }
  const rowBase = {
    groupId,
    category,
    company: 'gossamer-gear',
    companyKorean: '고싸머기어',
    name,
    nameKorean: name, // ⚠ 영문 폴백 — 한글화 별도 단계
    weight,
    specs,
    imageUrl: mainImage,
    _detailUrl: `${BASE}/products/${p.handle}`,
    _source: `${BASE}/products/${p.handle}`,
    _handle: p.handle,
  };
  const rows = [];
  const seen = new Set();
  for (const v of p.variants || []) {
    const colorRaw = ci ? (v[`option${ci}`] || '').trim() : '';
    const sizeRaw = si ? (v[`option${si}`] || '').trim() : '';
    const color = colorRaw && colorRaw !== 'Default Title' ? colorRaw : '';
    const size = sizeRaw && !['Default Title', 'None'].includes(sizeRaw) ? sizeRaw : '';
    const key = `${color}|${size}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      ...rowBase,
      color,
      colorKorean: color,
      size,
      sizeKorean: size,
      imageUrl: (color && colorImg[color]) || mainImage,
      _price: v.price || 0,
    });
  }
  return rows.length ? rows : [{ ...rowBase, color: '', colorKorean: '', size: '', sizeKorean: '' }];
};

// 무게 보존 재분류용(핸드오프 카테고리 계약 반영 후 기존 크롤 JSON 재분류에 사용).
export { classify, classifyByName, buildSpecs };

export default {
  name: 'gossamer-gear',
  company: 'gossamer-gear',
  companyKorean: '고싸머기어',
  baseUrl: BASE,
  defaultCategories: ['all'],
  crawl: async () => {
    const rows = [];
    let page = 1;
    const seenHandle = new Set();
    while (true) {
      const j = fetchJson(`${BASE}/products.json?limit=250&page=${page}`);
      if (!j || !j.products || !j.products.length) break;
      for (const p of j.products) {
        if (seenHandle.has(p.handle)) continue;
        seenHandle.add(p.handle);
        if ((p.product_type || '').toLowerCase() === 'gift card') continue;
        const weight = fetchWeightG(p.handle);
        rows.push(...buildRows(p, weight));
        if (seenHandle.size % 20 === 0) console.log(`[gossamer-gear]   ${seenHandle.size}개 (누적 ${rows.length}행)`);
      }
      page += 1;
    }
    console.log(`[gossamer-gear] 완료 ${seenHandle.size}개 상품 / ${rows.length}행`);
    return rows;
  },
};

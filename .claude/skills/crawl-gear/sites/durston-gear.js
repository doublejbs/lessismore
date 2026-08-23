// 더스턴기어(durstongear.com) — Shopify 스토어(캐나다 UL 텐트/백팩 브랜드, Dan Durston).
// 리스팅/변형/이미지는 products.json API, 무게·스펙은 상품페이지 서버렌더 SPECIFICATIONS 섹션에서.
//
// ⚠ 무게: Shopify variants[].grams는 배송무게라 부정확. 실제 무게는 상품페이지의
//    "SPECIFICATIONS" feature-chart에 라벨/값 쌍으로 렌더된다. 포맷이 상품군마다 다르다:
//      · 텐트:  "Complete Tent   26.2 oz / 745 g"   (oz / g)
//      · 백팩:  "Complete Pack (g)  Ultra 200X: 855 (S), 895 (M), 920g (L) …"  (원단·사이즈별)
//      · 폴:    "Strapless Version  134 g (4.7 oz) per pole"   (g (oz))
//    → g값 추출(라벨 우선순위 + 사이즈 매칭). Cloudflare는 없으나 curl 위임(스킬 관례, native fetch 회피).
// ⚠ 캐나다 브랜드라 상품명 영문뿐 → nameKorean도 영문(폴백). 한글화는 별도 단계.
// ⚠ 변형: Color→color, Torso Size/Size→size로 전개. 그 외 축(Fabric/Interior/Pole Set/Floor/
//    Hipbelt Size/Item/Tent Model/Quantity/Include stakes?/Handle Straps)은 접는다((color,size) dedup).
//    스페어 파츠(Item×Tent Model 조합 폭발)는 대표 1행으로 접어 카탈로그 오염 방지.
import { execFileSync } from 'node:child_process';

const BASE = 'https://durstongear.com';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = (ms) => execFileSync('sleep', [String(ms / 1000)]);
const curlGet = (url, marker = null, retries = 4) => {
  for (let i = 0; i < retries; i++) {
    try {
      const out = execFileSync('curl', ['-s', '--compressed', '-A', UA, url], { maxBuffer: 64 * 1024 * 1024, encoding: 'utf-8' });
      if (out && out.length > 500 && (!marker || out.includes(marker))) return out;
    } catch (e) {
      /* 재시도 */
    }
    sleep(400 * (i + 1));
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

// ── 카테고리 (product_type가 대부분 빈값 → 이름/handle 기준) ──
// 스페어/부속을 본 라인보다 먼저 판정한다(Spare Kakwa Parts가 kakwa→backpack로 새면 안 됨).
const classify = (name, handle, tags) => {
  const s = `${name} ${handle} ${tags}`.toLowerCase();
  if (/gift ?card/.test(s)) return 'etc';
  if (/sticker/.test(s)) return 'etc';
  if (/repair kit|dcf repair/.test(s)) return 'etc';
  if (/groundsheet/.test(s)) return 'tent_acc';
  if (/reflective|ironwire|guy ?line/.test(s)) return 'tent_acc';
  if (/stargazer/.test(s)) return 'tent_acc';
  if (/spare.*(kakwa|wapta|backpack)|kakwa.*parts|wapta.*parts/.test(s)) return 'etc'; // 백팩 부속
  if (/iceline.*(pole ?parts|spare)|pole ?parts/.test(s)) return 'etc'; // 폴 부속
  if (/spare|parts|z-flick|tent pole|\bstake/.test(s)) return 'tent_acc'; // 텐트 부속/스페어/스테이크
  if (/iceline|trekking ?pole/.test(s)) return 'trekking_pole';
  if (/kakwa|wapta/.test(s)) return 'backpack';
  if (/x-mid|x-dome/.test(s)) return 'tent';
  return 'etc';
};

// ── 상품페이지 SPECIFICATIONS 섹션 텍스트 추출 ──
const fetchSpecText = (handle) => {
  const html = curlGet(`${BASE}/products/${handle}`, 'SPECIFICATIONS');
  if (!html) return '';
  const i = html.search(/SPECIFICATIONS/i);
  if (i < 0) return '';
  const chunk = html.slice(i, i + 12000);
  // 태그 제거 + 엔티티 정리(CSS 잔여는 g/mm 매칭에 무해)
  return chunk.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ');
};

const gAfter = (text, labelRe) => {
  const m = text.match(new RegExp(labelRe.source + '[\\s\\S]{0,60}?([\\d.,]+)\\s*g\\b', 'i'));
  return m ? Math.round(parseFloat(m[1].replace(/,/g, ''))) : 0;
};
const firstG = (text) => {
  const m = text.match(/([\d.,]{2,})\s*g\b/);
  return m ? Math.round(parseFloat(m[1].replace(/,/g, ''))) : 0;
};

// 카테고리·사이즈별 무게(g). specText는 상품페이지 SPEC 섹션.
const weightFor = (specText, category, size) => {
  if (!specText) return 0;
  if (category === 'tent') {
    return gAfter(specText, /Complete Tent/) || gAfter(specText, /Trail Weight/) || gAfter(specText, /Typical Setup/) || firstG(specText);
  }
  if (category === 'backpack') {
    // "Ultra 200X : 855 (S), 895 (M), 920g (L)" — 사이즈 이니셜 매칭, 없으면 첫 값.
    const initial = (size || '').trim().charAt(0).toUpperCase();
    if (initial) {
      const m = specText.match(new RegExp('([\\d.,]{2,})\\s*g?\\s*\\(\\s*' + initial + '\\s*\\)', 'i'));
      if (m) return Math.round(parseFloat(m[1].replace(/,/g, '')));
    }
    return gAfter(specText, /Complete Pack/) || firstG(specText);
  }
  if (category === 'trekking_pole') {
    return gAfter(specText, /Strapless/) || gAfter(specText, /Weight/) || firstG(specText);
  }
  return gAfter(specText, /Weight/) || firstG(specText);
};

// ── 스펙 ──
const capacityFromName = (name) => {
  const m = name.match(/\b([12])\+?\b/); // X-Mid 1 / X-Mid 2 / X-Dome 1+
  return m ? `${m[1]}인` : '';
};
const volumeFromName = (name) => {
  const m = name.match(/\b(\d{2})\b/); // Kakwa 55 / Wapta 30 / Kakwa 40
  return m ? `${m[1]}L` : '';
};

const buildSpecs = (category, name, tags, specText = '') => {
  const s = {};
  const blob = `${name} ${tags}`;
  const isDCF = /dcf|dyneema/i.test(`${blob} ${specText}`);
  if (category === 'tent') {
    const cap = capacityFromName(name);
    if (cap) s.capacity = cap;
    // 소재: Canopy Fabric(X-Mid) / Fly Fabric(X-Dome) 행 — 값은 "3500mm"/" in "/" - " 앞까지.
    const fly = specText.match(/(?:Canopy|Fly)\s*Fabric\s*(.+?)(?=\s*\d{3,4}\s*mm|\s+in\s|\s*[-–])/i);
    s.flyMaterial = isDCF ? 'Dyneema (DCF)' : fly ? fly[1].trim() : '';
    const inner = specText.match(/Floor\s*Fabric\s*(.+?)(?=\s*\d{3,4}\s*mm|\s+in\s|\s*\(|\s*[-–])/i);
    if (inner) s.innerMaterial = inner[1].trim();
    const hh = specText.match(/([\d]{3,5})\s*mm\s*HH/i);
    if (hh) s.waterproofRating = `${hh[1]}mm`;
    // 피치 타입: X-Mid=트레킹폴, X-Dome=자립
    if (/x-mid/i.test(name)) s.pitchType = '트레킹폴';
    else if (/x-dome/i.test(name)) s.pitchType = '자립';
  } else if (category === 'backpack') {
    const vol = volumeFromName(name);
    if (vol) s.volume = vol;
    const main = specText.match(/Main\s*Fabric\s*(.+?)(?=\s+[-–]\s|\s*Daisy|\s*Front|\s*SIZING)/i);
    if (main) s.material = main[1].trim();
    else if (isDCF) s.material = 'Dyneema (DCF)';
    s.hasHipBelt = true;
  } else if (category === 'trekking_pole') {
    if (/carbon/i.test(`${blob} ${specText}`)) s.material = 'Carbon';
    s.foldType = '접이식';
    const coll = specText.match(/Collapsed\s*([\d]{2,3})\s*cm/i);
    if (coll) s.minLength = `${coll[1]}cm`;
    const ext = specText.match(/Extended\s*([\d]{2,3})\s*cm/i) || specText.match(/Max(?:imum)?\s*([\d]{2,3})\s*cm/i);
    if (ext) s.maxLength = `${ext[1]}cm`;
  } else if (isDCF) {
    s.material = 'Dyneema (DCF)';
  }
  return s;
};

// ── 변형 축 판별 ──
const isColorAxis = (name) => /color/i.test(name);
const isSizeAxis = (name) => !/hipbelt/i.test(name) && (/torso/i.test(name) || /\bsize\b/i.test(name));
const optIndexFor = (options, pred) => {
  const i = options.findIndex((o) => pred(o.name));
  return i >= 0 ? i + 1 : 0;
};

const slugify = (s) => (s || '').trim().toLowerCase().replace(/\+/g, '-plus').replace(/\s+/g, '-').replace(/[^a-z0-9가-힣-]/g, '');

const buildRows = (p) => {
  const name = (p.title || '').trim();
  const tags = (p.tags || []).join(' ');
  const category = classify(name, p.handle, tags);
  const specText = fetchSpecText(p.handle);
  const ci = optIndexFor(p.options, isColorAxis);
  const si = optIndexFor(p.options, isSizeAxis);
  const groupId = `durston-gear_${slugify(name) || p.handle}`;
  const mainImage = (p.images && p.images[0] && `https:${p.images[0].src}`.replace(/^https:https:/, 'https:')) || '';
  const colorImg = {};
  for (const v of p.variants || []) {
    const col = ci ? v[`option${ci}`] : '';
    if (col && v.featured_image && !colorImg[col]) colorImg[col] = `https:${v.featured_image.src}`.replace(/^https:https:/, 'https:');
  }
  const rowBase = {
    groupId,
    category,
    company: 'Durston Gear', // ⚠ 기존 수동입력 문서(company="Durston Gear")와 통일 — 앱에서 한 브랜드로 묶이게.
    companyKorean: '더스턴기어',
    name,
    nameKorean: name, // 영문 폴백 — 한글화 별도 단계
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
    const weight = weightFor(specText, category, size);
    rows.push({
      ...rowBase,
      weight,
      specs: buildSpecs(category, name, tags, specText),
      color,
      colorKorean: color,
      size,
      sizeKorean: size,
      imageUrl: (color && colorImg[color]) || mainImage,
      _price: v.price || 0,
    });
  }
  return rows.length ? rows : [{ ...rowBase, weight: weightFor(specText, category, ''), specs: buildSpecs(category, name, tags, specText), color: '', colorKorean: '', size: '', sizeKorean: '' }];
};

export { classify, buildSpecs };

export default {
  name: 'durston-gear',
  company: 'durston-gear',
  companyKorean: '더스턴기어',
  baseUrl: BASE,
  defaultCategories: ['all'],
  crawl: async () => {
    const rows = [];
    const seenHandle = new Set();
    let page = 1;
    while (true) {
      const j = fetchJson(`${BASE}/products.json?limit=250&page=${page}`);
      if (!j || !j.products || !j.products.length) break;
      for (const p of j.products) {
        if (seenHandle.has(p.handle)) continue;
        seenHandle.add(p.handle);
        if ((p.product_type || '').toLowerCase() === 'gift card' || /gift-card/i.test(p.handle)) continue;
        rows.push(...buildRows(p));
        console.log(`[durston-gear]   ${p.title} (${seenHandle.size})`);
      }
      page += 1;
    }
    console.log(`[durston-gear] 완료 ${seenHandle.size}개 상품 / ${rows.length}행`);
    return rows;
  },
};

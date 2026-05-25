const CATEGORY_MAP = {
  'sleeping-bags/sleeping-bags': 'sleeping_bag',
  'sleeping-bags/down-sleeping-bags': 'sleeping_bag',
  'sleeping-bags/synthetic-sleeping-bags': 'sleeping_bag',
  'sleeping-bags/lightweight-sleeping-bags': 'sleeping_bag',
  'sleeping-bags/below-30-c': 'sleeping_bag',
  'sleeping-bags/sleeping-mats': 'mat',
  'sleeping-bags/tents': 'tent',
  'sleeping-bags/bivis': 'shelter',
  'sleeping-bags/tarps': 'tarp',
  'backpacks/all': 'backpack',
  'backpacks/day-packs': 'backpack',
  'backpacks/trekking': 'backpack',
  'backpacks/mountain': 'backpack',
  'backpacks/50l-backpacks': 'backpack',
  'backpacks/60l-backpacks': 'backpack',
  'backpacks/nd-packs': 'backpack',
  'backpacks/kitbags': 'backpack',
  'backpacks/running-vests': 'vest_pack',
  'backpacks/belt-packs': 'pouch',
  'mens/all-jackets': 'clothing',
  'mens/down-jackets': 'clothing',
  'mens/waterproof-jackets': 'clothing',
  'mens/insulated-jackets': 'clothing',
  'mens/softshell-jackets': 'clothing',
  'mens/gore-tex-jackets': 'clothing',
  'mens/fleece': 'clothing',
  'mens/hoodies': 'clothing',
  'mens/baselayer-tops': 'clothing',
  'mens/baselayer-pants': 'clothing',
  'mens/all-tops': 'clothing',
  'mens/all-legwear': 'clothing',
  'mens/all-mens-clothing': 'clothing',
  'mens/hats-caps': 'etc',
  'womens/all-jackets': 'clothing',
  'womens/down-jackets': 'clothing',
  'accessories-equipment/gaiters': 'gaiter',
  'accessories-equipment/gloves': 'gloves',
  'accessories-equipment/footwear': 'etc',
};

const guessCategory = (url) => {
  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (url.includes(key)) return value;
  }
  return null;
};

const slugFromUrl = (url) => {
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\/kr\//, '').replace(/\/$/, '').replace(/\//g, '-');
  } catch (e) {
    return '';
  }
};

const loadAll = async (page) => {
  try {
    await page.waitForSelector('.ais-InfiniteHits-item', { timeout: 15000 });
  } catch (e) {
    return false;
  }
  let prevCount = 0;
  for (let i = 0; i < 50; i += 1) {
    const count = await page.$$eval('.ais-InfiniteHits-item', (els) => els.length);
    if (count === prevCount && i > 0) break;
    prevCount = count;

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 1200));

    const clicked = await page.evaluate(() => {
      const btn = document.querySelector(
        '.ais-InfiniteHits-loadMore:not(.ais-InfiniteHits-loadMore--disabled), button.ais-InfiniteHits-loadMore'
      );
      if (btn && !btn.disabled) {
        btn.click();
        return true;
      }
      return false;
    });
    if (!clicked) {
      const after = await page.$$eval('.ais-InfiniteHits-item', (els) => els.length);
      if (after === count) break;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return true;
};

const extractListing = async (page) => {
  return page.evaluate(() => {
    const items = document.querySelectorAll('.ais-InfiniteHits-item');
    return Array.from(items).map((item) => {
      const nameEl = item.querySelector('h2[itemprop="name"]');
      const urlEl = item.querySelector('meta[itemprop="url"]');
      const imgEl = item.querySelector('img[itemprop="image"]');
      const swatchEl = item.querySelector('[data-swatch-label]');

      let imageUrl = imgEl?.getAttribute('src') ?? '';
      if (imageUrl.startsWith('http://')) imageUrl = 'https://' + imageUrl.slice(7);

      const detailUrl = urlEl?.getAttribute('content')?.split('?')[0] ?? '';

      return {
        nameKorean: nameEl?.textContent.trim() ?? '',
        detailUrl,
        imageUrl,
        color: swatchEl?.getAttribute('data-swatch-label') ?? '',
      };
    });
  });
};

const fetchDetail = async (page, detailUrl, category) => {
  const empty = { weight: 0, specs: {}, nameEnglish: '' };
  if (!detailUrl) return empty;
  try {
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));
    return page.evaluate((cat) => {
      // Precise spec rows from RAB's "기능" section (ul.border-t-2.border-black > li).
      // Used for labeled extraction (중량, 인슐레이션, 온도 등급 etc).
      const specLis = document.querySelectorAll('ul.border-t-2.border-black li, li.border-b.border-black');
      const rowSet = new Set();
      specLis.forEach((li) => {
        const t = li.textContent.replace(/\s+/g, ' ').trim();
        if (t.length > 3 && t.length < 400) rowSet.add(t);
      });
      if (rowSet.size === 0) {
        document.querySelectorAll('li').forEach((li) => {
          const t = li.textContent.replace(/\s+/g, ' ').trim();
          if (t.length > 3 && t.length < 400) rowSet.add(t);
        });
      }
      const rows = Array.from(rowSet);

      // All-page rows used for fabric keyword fallback when product doesn't expose
      // material in the spec section but mentions it in description / features list.
      const allRowSet = new Set();
      document.querySelectorAll('li, p').forEach((el) => {
        const t = el.textContent.replace(/\s+/g, ' ').trim();
        if (t.length > 10 && t.length < 250) allRowSet.add(t);
      });
      const allRows = Array.from(allRowSet);

      const html = document.documentElement.outerHTML;

      const findRow = (label) => rows.find((r) => r.startsWith(label));

      const parseWeight = () => {
        const row = findRow('중량');
        const m =
          row?.match(/(\d+(?:\.\d+)?)\s*(kg|g)\b/i) ??
          html.match(/중량[\s\S]{0,100}?(\d+(?:\.\d+)?)\s*(kg|g)\b/i);
        if (!m) return 0;
        const v = parseFloat(m[1]);
        return m[2].toLowerCase() === 'kg' ? Math.round(v * 1000) : Math.round(v);
      };

      const nameEnglishRow = rows.find((r) => /^영문제품명/.test(r));
      const nameEnglish = nameEnglishRow ? nameEnglishRow.replace(/^영문제품명\s*/, '').trim() : '';

      // Material row helper: 메인 원단 / 안감 원단 etc — take label out, return remainder
      const fabricLabels = ['메인 원단', '안감 원단', '메인 패브릭'];
      const FABRIC_KEYWORDS = [
        'Pertex', 'Cordura', 'Dyneema', 'GORE-TEX', 'Gore-Tex',
        'eVent', 'Polartec', 'PrimaLoft',
        '나일론', '폴리에스터', '폴리아미드', '립스탑', '플리스',
        'ripstop', 'nylon', 'polyester',
      ];
      // Technical fabric markers (D = denier, gsm, PU/DWR coatings, denier, mm HH waterproof rating)
      const TECH_PATTERN = /(\d+\s?D\b|gsm|GSM|\bdenier\b|\bPU\b|\bDWR\b|코팅|립스탑|\d+mm\s*HH|ePE|ripstop)/;
      const findFabricRow = () => {
        for (const label of fabricLabels) {
          const r = rows.find((row) => row.startsWith(label));
          if (r) return r.replace(label, '').trim();
        }
        // Fallback 1: fabric keyword within spec section (high signal — spec section unlikely to have nav)
        for (const row of rows) {
          if (row.length > 200) continue;
          if (FABRIC_KEYWORDS.some((k) => row.includes(k))) return row.trim();
        }
        // Fallback 2: anywhere on page — require BOTH fabric keyword AND technical pattern
        for (const row of allRows) {
          if (row.length > 250) continue;
          if (!FABRIC_KEYWORDS.some((k) => row.includes(k))) continue;
          if (!TECH_PATTERN.test(row)) continue;
          return row.trim();
        }
        return '';
      };

      // Waterproof: dedicated row OR "방수 압력" inline OR known waterproof tech in material
      const waterproofRow =
        rows.find((r) => /^정수압 헤드/.test(r)) ?? rows.find((r) => /방수 압력\s*\d/.test(r));
      const parseWaterproofMm = () => {
        if (!waterproofRow) return null;
        const m = waterproofRow.match(/(\d+(?:,\d+)?)\s*mm/);
        if (!m) return null;
        return parseInt(m[1].replace(/,/g, ''), 10);
      };
      const isWaterproofFromRow = () => {
        const v = parseWaterproofMm();
        if (v == null) return null;
        return v >= 5000;
      };
      const isWaterproofFromMaterial = (fabric) => {
        if (!fabric) return null;
        if (/GORE-?TEX|eVent|Pertex Shield|Pertex® Shield/i.test(fabric)) return true;
        return null;
      };

      const specs = {};

      if (cat === 'sleeping_bag') {
        for (const row of rows) {
          if (row.includes('편안') && row.includes('한계') && row.includes('°')) {
            const c = row.match(/편안\s*:\s*(-?\d+(?:\.\d+)?)\s*°/);
            if (c && specs.comfortTemp == null) specs.comfortTemp = parseFloat(c[1]);
            const l = row.match(/(?:편안함의 한계|랩 수면 한계)\s*:?\s*(-?\d+(?:\.\d+)?)\s*°/);
            if (l && specs.limitTemp == null) specs.limitTemp = parseFloat(l[1]);
          }
          const limStandalone = row.match(/^(?:편안함의 한계|랩 수면 한계)\s*(-?\d+(?:\.\d+)?)\s*°/);
          if (limStandalone && specs.limitTemp == null) specs.limitTemp = parseFloat(limStandalone[1]);
        }

        const insRow = rows.find((r) => /^인슐레이션\s*\d/.test(r));
        if (insRow) {
          const fp = insRow.match(/(\d{3,4})\s*FP/i);
          if (fp) specs.fillPower = parseInt(fp[1], 10);
          const fw = insRow.match(/\((\d+(?:\.\d+)?)\s*g\s*[/)]/);
          if (fw) specs.fillWeight = parseFloat(fw[1]);
          if (/down|구스|덕다운|오리털|거위털|goose|duck|다운/i.test(insRow)) {
            specs.fillMaterial = 'down';
          } else if (/synthetic|합성|폴리|primaloft/i.test(insRow)) {
            specs.fillMaterial = 'synthetic';
          }
        }
      }

      if (cat === 'backpack' || cat === 'vest_pack') {
        const urlVol = location.pathname.match(/(\d+)\s*l(?:-|\b)/i);
        if (urlVol) specs.volume = parseInt(urlVol[1], 10);
        const blRow = rows.find((r) => /^등길이/.test(r));
        if (blRow) {
          const m = blRow.match(/(\d+)\s*cm/);
          if (m) specs.backLength = parseInt(m[1], 10);
        }
        const fabric = findFabricRow();
        if (fabric) specs.material = fabric.slice(0, 120);
      }

      if (cat === 'clothing') {
        const urlPath = location.pathname.toLowerCase();
        if (/jacket/i.test(urlPath) || /자켓/.test(rows[0] ?? '')) specs.type = 'jacket';
        else if (/pants|trouser|legwear/i.test(urlPath)) specs.type = 'pants';
        else if (/top|hoody|tee|shirt/i.test(urlPath)) specs.type = 'top';
        else if (/vest/i.test(urlPath)) specs.type = 'vest';

        const fabric = findFabricRow();
        if (fabric) specs.material = fabric.slice(0, 120);

        const wp = isWaterproofFromRow() ?? isWaterproofFromMaterial(fabric);
        if (wp !== null) specs.isWaterproof = wp;
        else if (/방수|waterproof|gore-?tex/i.test(urlPath)) specs.isWaterproof = true;

        const insRow = rows.find((r) => /^인슐레이션\s*\d/.test(r));
        if (insRow) {
          if (/down|구스|덕다운|goose|duck|다운/i.test(insRow)) specs.fillMaterial = 'down';
          else if (/synthetic|합성|primaloft|폴리/i.test(insRow)) specs.fillMaterial = 'synthetic';
        }

        const title = document.title || '';
        if (/hood(y|ed|ie)|후드/i.test(title) || /hood(y|ed|ie)|후드/i.test(urlPath)) {
          specs.hasHood = true;
        }
      }

      if (cat === 'mat') {
        const fabric = findFabricRow();
        if (fabric) specs.material = fabric.slice(0, 120);
        const dimRow = rows.find((r) => /^치수/.test(r));
        if (dimRow) {
          specs.openSize = dimRow.replace(/^치수\s*/, '').slice(0, 120);
          const all = [...dimRow.matchAll(/(\d+(?:\.\d+)?)\s*cm/g)];
          if (all.length >= 3) specs.thickness = parseFloat(all[2][1]) * 10;
        }
        const thickRow = rows.find((r) => /^두께\s*[:\s]\s*\d/.test(r));
        if (thickRow && !specs.thickness) {
          const m = thickRow.match(/(\d+(?:\.\d+)?)\s*(cm|mm)/i);
          if (m) specs.thickness = m[2].toLowerCase() === 'cm' ? parseFloat(m[1]) * 10 : parseFloat(m[1]);
        }
        // RAB encodes R-value in the product name (e.g., "아이오노스피어 5.5", "엑소스피어 3.5")
        const nameRMatch = (document.title || '').match(/\b(\d+\.\d+|\d+)\b(?!\s*(L|cm|mm|g|kg))/);
        if (nameRMatch) {
          const v = parseFloat(nameRMatch[1]);
          if (v >= 1 && v <= 10) specs.rValue = v;
        }
      }

      if (cat === 'tent' || cat === 'shelter') {
        const title = document.title || '';
        const rangeM = title.match(/(\d+)\s*-\s*(\d+)\s*(?:person|인|p\b)/i);
        const singleM = title.match(/(\d+)\s*(?:person|인|p\b)/i);
        const tailM = title.match(/\s(\d+)(?:\s|$)/);
        if (rangeM) specs.capacity = parseInt(rangeM[2], 10);
        else if (singleM) specs.capacity = parseInt(singleM[1], 10);
        else if (tailM) {
          const v = parseInt(tailM[1], 10);
          if (v >= 1 && v <= 12) specs.capacity = v;
        }
        const fabric = findFabricRow();
        if (fabric) specs.flyMaterial = fabric.slice(0, 120);
        const wpMm = parseWaterproofMm();
        if (wpMm) specs.waterproofRating = wpMm;
      }

      if (cat === 'tarp') {
        const fabric = findFabricRow();
        if (fabric) specs.material = fabric.slice(0, 120);
        const wpMm = parseWaterproofMm();
        if (wpMm) specs.waterproofRating = wpMm;
      }

      if (cat === 'gaiter') {
        const fabric = findFabricRow();
        if (fabric) specs.material = fabric.slice(0, 120);
        const wp = isWaterproofFromRow() ?? isWaterproofFromMaterial(fabric);
        if (wp !== null) specs.isWaterproof = wp;
        else if (/gore-?tex|waterproof|방수/i.test(location.pathname)) specs.isWaterproof = true;
      }

      if (cat === 'gloves') {
        const fabric = findFabricRow();
        if (fabric) specs.material = fabric.slice(0, 120);
        const wp = isWaterproofFromRow() ?? isWaterproofFromMaterial(fabric);
        if (wp !== null) specs.isWaterproof = wp;
        else if (/gore-?tex|waterproof|방수/i.test(location.pathname)) specs.isWaterproof = true;
        const urlPath = location.pathname.toLowerCase();
        if (/liner/i.test(urlPath)) specs.type = 'liner';
        else if (/mitten|벙어리/i.test(urlPath)) specs.type = 'mitten';
        else if (/glove/i.test(urlPath)) specs.type = 'glove';
      }

      if (cat === 'pouch' || cat === 'backpack_cover') {
        const fabric = findFabricRow();
        if (fabric) specs.material = fabric.slice(0, 120);
        const wp = isWaterproofFromRow() ?? isWaterproofFromMaterial(fabric);
        if (wp !== null) specs.isWaterproof = wp;
        const urlVol = location.pathname.match(/(\d+)\s*l(?:-|\b)/i);
        if (urlVol) specs.volume = parseInt(urlVol[1], 10);
      }

      return { weight: parseWeight(), specs, nameEnglish };
    }, category);
  } catch (e) {
    return empty;
  }
};

const crawlCategory = async (browser, categoryUrl, { withWeight = true } = {}) => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  try {
    await page.goto(categoryUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.log(`[rab] navigation failed: ${categoryUrl} - ${e.message}`);
    await page.close();
    return [];
  }
  const loaded = await loadAll(page);
  if (!loaded) {
    console.log(`[rab] no items found at ${categoryUrl}`);
    await page.close();
    return [];
  }
  const items = await extractListing(page);

  const category = guessCategory(categoryUrl) ?? 'etc';
  const results = [];
  for (const it of items) {
    let weight = 0;
    let specs = {};
    let nameEnglish = '';
    if (withWeight && it.detailUrl) {
      const detail = await fetchDetail(page, it.detailUrl, category);
      weight = detail.weight;
      specs = detail.specs;
      nameEnglish = detail.nameEnglish;
    }
    results.push({
      groupId: `rab_${slugFromUrl(it.detailUrl)}`,
      category,
      company: 'rab',
      companyKorean: '랩',
      name: nameEnglish || it.nameKorean,
      nameKorean: it.nameKorean,
      color: it.color,
      colorKorean: '',
      size: '',
      sizeKorean: '',
      weight,
      imageUrl: it.imageUrl,
      specs,
      _source: categoryUrl,
    });
  }
  await page.close();
  return results;
};

export default {
  name: 'rab',
  company: 'rab',
  baseUrl: 'https://rab.equipment',
  defaultCategories: [
    'https://rab.equipment/kr/sleeping-bags/sleeping-bags',
    'https://rab.equipment/kr/sleeping-bags/sleeping-mats',
    'https://rab.equipment/kr/sleeping-bags/tents',
    'https://rab.equipment/kr/backpacks/all',
  ],
  crawl: async (browser, { categoryUrls, withWeight = true } = {}) => {
    const urls = categoryUrls?.length ? categoryUrls : ['https://rab.equipment/kr/sleeping-bags/sleeping-bags'];
    const all = [];
    for (const url of urls) {
      console.log(`[rab] crawling ${url}`);
      try {
        const items = await crawlCategory(browser, url, { withWeight });
        console.log(`[rab] ${items.length} items from ${url}`);
        all.push(...items);
      } catch (e) {
        console.log(`[rab] error on ${url}: ${e.message} — skipping`);
      }
    }
    return all;
  },
};

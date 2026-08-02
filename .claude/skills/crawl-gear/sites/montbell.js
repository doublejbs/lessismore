// Montbell Japan English shop (https://www.montbell.com/jp/en)
// Listing: POST /jp/en/products/more?c={catId} {"o":offset,"l":24} → JSON {products:[...]}
//   - products[].sorting_weight: grams (no detail page needed for weight)
//   - products[].colors: {CODE: {color_name_en, color_name(JP), sizes: {CODE: {...}}}}
// Detail:  /jp/en/products/detail/{productId} → table.table-specs tr (th + td pairs)

const BASE_URL = 'https://www.montbell.com';

// ?c= 파라미터 → 내부 카테고리 키
const CATEGORY_MAP = {
  4: 'clothing',      // Alpine Clothing
  5: 'clothing',      // Rainwear
  6: 'clothing',      // Insulated Clothing
  7: 'clothing',      // Soft Shells
  8: 'clothing',      // Fleeces
  9: 'clothing',      // Wind Shells
  10: 'clothing',     // Vests
  11: 'clothing',     // T-Shirts
  12: 'clothing',     // Shirts
  13: 'clothing',     // Sweatshirts & Sweaters
  14: 'clothing',     // Bottoms
  15: 'clothing',     // Skirts & Dresses
  16: 'clothing',     // Base Layers
  17: 'etc',          // Supporters & Warmers
  18: 'etc',          // Socks
  19: 'gloves',       // Gloves
  20: 'etc',          // Head & Neck Wear
  21: 'clothing',     // Kid's & Baby's Clothing
  22: 'clothing',     // Fan Compatible Clothing
  23: 'clothing',     // Outdoor Workwear
  24: 'clothing',     // Water Activity Clothing
  25: 'clothing',     // Fishing Clothing
  27: 'clothing',     // Travel & Country
  28: 'clothing',     // Cycling Clothing
  29: 'clothing',     // Motorcycling Clothing
  30: 'clothing',     // Trail Running Clothing
  31: 'clothing',     // Camping Clothing
  32: 'clothing',     // Climbing Clothing
  34: 'sleeping_bag', // Sleeping Bags & Pads (mat 분리)
  35: 'tent',         // Tents & Shelters
  36: 'etc',          // Footwear
  38: 'backpack',     // Backpacks
  39: 'pouch',        // Bags
  40: 'etc',          // Camp Furniture
  41: 'bottle',       // Bottles
  42: 'cookware_etc', // Cookware
  43: 'food',         // Food
  44: 'lighting',     // Lighting
  45: 'sunglasses',   // Eyewear
  46: 'trekking_pole',// Trekking Poles
  47: 'etc',          // Helmets
  48: 'etc',          // Umbrellas
  49: 'etc',          // Accessories
  50: 'etc',          // Emergency & Survival Gear
  51: 'etc',          // Kid's & Baby's Gear
  54: 'etc',          // Snow Gear
  55: 'etc',          // Water Gear
  57: 'etc',          // Fishing Gear
  58: 'etc',          // Cycling Gear
  59: 'etc',          // Motorcycling Gear
  60: 'etc',          // Photography Gear
  61: 'etc',          // Climbing Gear
  62: 'etc',          // Outdoor Working Gear
};

const getCatIdFromUrl = (url) => {
  try { return new URL(url).searchParams.get('c') ?? ''; } catch { return ''; }
};

const guessCategory = (catId, productName = '') => {
  const base = CATEGORY_MAP[Number(catId)] ?? 'etc';
  // c=34 (Sleeping Bags & Pads) 내 매트 제품 분리
  if (base === 'sleeping_bag' && /\bpad\b|\bmat\b|foam/i.test(productName)) return 'mat';
  return base;
};

// POST API로 카테고리 내 모든 상품 JSON 페칭 (offset/limit 방식)
const fetchAllProductsFromAPI = async (page, catId) => {
  await page.goto(`${BASE_URL}/jp/en/products/list?c=${catId}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await new Promise((r) => setTimeout(r, 2000));

  const allProducts = [];
  let offset = 0;
  const limit = 24;

  while (true) {
    const batch = await page.evaluate(async (cid, o, l) => {
      const csrf = document.querySelector('meta[name="csrf-token"]')?.content ?? '';
      try {
        const resp = await fetch(`/jp/en/products/more?c=${cid}`, {
          method: 'POST',
          headers: {
            'X-CSRF-TOKEN': csrf,
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify({ o, l }),
        });
        if (!resp.ok) return [];
        const j = await resp.json();
        return j.products ?? [];
      } catch {
        return [];
      }
    }, catId, offset, limit);

    if (!batch || batch.length === 0) break;
    allProducts.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
    await new Promise((r) => setTimeout(r, 400));
  }

  return allProducts;
};

// 상세 페이지 spec 추출 (table.table-specs 기반)
const fetchDetail = async (page, productCode, category) => {
  try {
    await page.goto(`${BASE_URL}/jp/en/products/detail/${productCode}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 800));

    return page.evaluate((cat) => {
      // table.table-specs의 th→label, td→value 매핑
      const specMap = {};
      document.querySelectorAll('table.table-specs tr').forEach((tr) => {
        const th = tr.querySelector('th');
        const td = tr.querySelector('td');
        if (th && td) {
          const label = th.textContent.replace(/[：:]\s*$/, '').trim();
          const value = td.textContent.replace(/\s+/g, ' ').trim();
          if (value) specMap[label] = value;
        }
      });

      // PFAS shipping notice gets concatenated onto the Material cell — drop it
      // (and everything after it; it's always the trailing sentence).
      const material = (specMap['Material'] ?? '')
        .replace(/This product contains PFAS[\s\S]*$/i, '')
        .trim();
      const capacity = specMap['Capacity'] ?? '';
      const tempRating = specMap['Temperature Rating'] ?? '';
      const packedSize = specMap['Packed Size'] ?? '';
      const sizeGuide = specMap['Size Guide'] ?? '';
      const h1 = document.querySelector('h1')?.textContent.trim() ?? '';
      const specs = {};

      // Weight from the spec table (the displayed/authoritative figure). The listing
      // API's `sorting_weight` is a sort key that can diverge from the real spec weight
      // (e.g. Stellaridge Tent 3 Rain Fly: sorting_weight 420 vs spec Weight 470 g).
      // Priority: Weight → Total Weight → Set Weight. Use the metric value only.
      const parseW = (s) => {
        const m = (s || '').match(/([\d.]+)\s*(kg|g)\b/i);
        if (!m) return 0;
        const v = parseFloat(m[1]);
        return m[2].toLowerCase() === 'kg' ? Math.round(v * 1000) : Math.round(v);
      };
      const detailWeight =
        parseW(specMap['Weight']) || parseW(specMap['Total Weight']) || parseW(specMap['Set Weight']);

      if (cat === 'sleeping_bag') {
        // "X °F / Y °C (Comfort), ... °C (Lower Limit)"
        const comfortM = tempRating.match(/(-?\d+(?:\.\d+)?)\s*°\s*C\s*\(Comfort\)/);
        const limitM = tempRating.match(/(-?\d+(?:\.\d+)?)\s*°\s*C\s*\(Lower Limit\)/);
        if (comfortM) specs.comfortTemp = parseFloat(comfortM[1]);
        if (limitM) specs.limitTemp = parseFloat(limitM[1]);

        if (/\bdown\b|goose|duck/i.test(material)) specs.fillMaterial = 'down';
        else if (/synthetic|polyester|primaloft/i.test(material)) specs.fillMaterial = 'synthetic';

        const zipM = (specMap['Other'] ?? '').match(/(left|right)-hand zip/i);
        if (zipM) specs.zipperSide = zipM[1].toLowerCase();
      }

      if (cat === 'mat') {
        if (material) specs.material = material.slice(0, 150);
        if (sizeGuide) specs.openSize = sizeGuide.slice(0, 100);
        const thickM = sizeGuide.match(/(\d+(?:\.\d+)?)\s*cm(?:\s*\(thick)/i);
        if (thickM) specs.thickness = parseFloat(thickM[1]) * 10;
      }

      if (cat === 'backpack' || cat === 'vest_pack') {
        const capM = capacity.match(/(\d+(?:\.\d+)?)\s*L/);
        if (capM) specs.volume = parseFloat(capM[1]);
        if (material) specs.material = material.slice(0, 150);
        if (/women|female|femme/i.test(h1)) specs.gender = 'female';
        else if (/men|male/i.test(h1) && !/women/i.test(h1)) specs.gender = 'male';
        else specs.gender = 'unisex';
      }

      if (cat === 'tent' || cat === 'shelter' || cat === 'tarp') {
        if (material) specs.flyMaterial = material.slice(0, 150);
        // "1,500mm water resistance" 패턴
        const wpM = material.match(/(\d[\d,]+)\s*mm\s*water\s*resist/i);
        if (wpM) specs.waterproofRating = parseInt(wpM[1].replace(/,/g, ''), 10);
        if (/aluminum|aluminium/i.test(material)) specs.poleMaterial = 'aluminum';
        else if (/carbon/i.test(material)) specs.poleMaterial = 'carbon';
        else if (/fiberglass|fibreglass/i.test(material)) specs.poleMaterial = 'fiberglass';
      }

      if (cat === 'clothing') {
        if (material) specs.material = material.slice(0, 150);
        // 방수 판정: mm water resistance ≥5000 or GORE-TEX / DRYTEC
        const wpMmM = material.match(/(\d[\d,]+)\s*mm\s*water\s*resist/i);
        if (wpMmM) specs.isWaterproof = parseInt(wpMmM[1].replace(/,/g, ''), 10) >= 5000;
        else if (/gore-?tex|drytec|eVent/i.test(material)) specs.isWaterproof = true;
        else if (/waterproof/i.test(material)) specs.isWaterproof = true;

        if (/\bdown\b|goose|duck/i.test(material)) specs.fillMaterial = 'down';
        else if (/synthetic|insulate|primaloft/i.test(material)) specs.fillMaterial = 'synthetic';

        if (/hood/i.test(h1)) specs.hasHood = true;
      }

      if (cat === 'bottle') {
        const capM = capacity.match(/(\d+(?:\.\d+)?)\s*(L|ml)/i);
        if (capM) {
          const v = parseFloat(capM[1]);
          specs.capacity = capM[2].toLowerCase() === 'l' ? Math.round(v * 1000) : Math.round(v);
        }
        if (/titanium|ti\b/i.test(material)) specs.material = 'titanium';
        else if (/stainless/i.test(material)) specs.material = 'stainless';
        else if (/alumin/i.test(material)) specs.material = 'aluminum';
        else if (/plastic|polypropylene/i.test(material)) specs.material = 'plastic';
        specs.isInsulated = /insulate|thermal|thermo/i.test(h1);
      }

      if (cat === 'cookware_etc' || cat === 'cup' || cat === 'bowl') {
        const capM = capacity.match(/(\d+(?:\.\d+)?)\s*(L|ml)/i);
        if (capM) {
          const v = parseFloat(capM[1]);
          specs.capacity = capM[2].toLowerCase() === 'l' ? Math.round(v * 1000) : Math.round(v);
        }
        if (material) specs.material = material.slice(0, 100);
      }

      if (cat === 'trekking_pole') {
        if (material) specs.material = material.slice(0, 100);
        const lenM = sizeGuide.match(/(\d+)\s*-\s*(\d+)\s*cm/);
        if (lenM) {
          specs.minLength = parseInt(lenM[1], 10);
          specs.maxLength = parseInt(lenM[2], 10);
        }
      }

      if (cat === 'gloves') {
        if (material) specs.material = material.slice(0, 100);
        if (/gore-?tex|waterproof/i.test(material)) specs.isWaterproof = true;
        if (/mitten|mitt\b/i.test(h1)) specs.type = 'mitten';
        else if (/liner/i.test(h1)) specs.type = 'liner';
        else specs.type = 'glove';
      }

      if (cat === 'pouch' || cat === 'backpack_cover') {
        if (material) specs.material = material.slice(0, 100);
        const capM = capacity.match(/(\d+(?:\.\d+)?)\s*L/);
        if (capM) specs.capacity = parseFloat(capM[1]);
        if (/waterproof|water\s*resist/i.test(material)) specs.isWaterproof = true;
      }

      return { specs, weight: detailWeight };
    }, category);
  } catch {
    return { specs: {} };
  }
};

const crawlCategory = async (browser, categoryUrl, { withWeight = true } = {}) => {
  const catId = getCatIdFromUrl(categoryUrl);
  if (!catId) {
    console.log(`[montbell] invalid category URL: ${categoryUrl}`);
    return [];
  }

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  await page.setViewport({ width: 1280, height: 900 });

  try {
    // 1. 카테고리 내 모든 상품 JSON 페칭 (weight은 sorting_weight으로 여기서 확보)
    const rawProducts = await fetchAllProductsFromAPI(page, catId);
    console.log(`[montbell]   ${rawProducts.length} products in c=${catId}`);

    const results = [];
    const detailFetched = new Map(); // productCode → specs (중복 방지)

    for (let i = 0; i < rawProducts.length; i++) {
      const p = rawProducts[i];
      const productCode = p.product_code;
      const productName = p.name ?? '';
      const category = guessCategory(catId, productName);

      // 2. 상세 페이지 spec + weight 추출 (제품당 1회)
      // weight은 상세 스펙 테이블 Weight 필드 우선, 없으면 listing API sorting_weight 폴백.
      let specs = {};
      let weightG = p.sorting_weight ?? 0;
      if (withWeight) {
        if (!detailFetched.has(productCode)) {
          const detail = await fetchDetail(page, productCode, category);
          detailFetched.set(productCode, { specs: detail.specs ?? {}, weight: detail.weight ?? 0 });
          console.log(`[montbell]   detail ${detailFetched.size}/${rawProducts.length} ${productName}`);
          await new Promise((r) => setTimeout(r, 300));
        }
        const cached = detailFetched.get(productCode);
        specs = { ...cached.specs };
        if (cached.weight > 0) weightG = cached.weight;
      }

      // 제품명에서 추가 spec 보완
      if (category === 'tent' || category === 'shelter') {
        if (!specs.capacity) {
          const m = productName.match(/\b(\d+)\s*(?:person|people)\b/i)
            ?? productName.match(/\bTent\s+(\d+)\b/);
          if (m) {
            const v = parseInt(m[1], 10);
            if (v >= 1 && v <= 12) specs.capacity = v;
          }
        }
      }

      if (category === 'sleeping_bag') {
        // "Down Hugger 900 #5" → fillPower=900
        if (!specs.fillPower) {
          const fpM = productName.match(/\b(\d{3,4})\b/);
          if (fpM) {
            const v = parseInt(fpM[1], 10);
            if (v >= 400 && v <= 1000) specs.fillPower = v;
          }
        }
        if (!specs.fillMaterial && /down|hugger/i.test(productName)) specs.fillMaterial = 'down';
      }

      if (category === 'clothing') {
        if (!specs.type) {
          if (/jacket|parka|anorak/i.test(productName)) specs.type = 'jacket';
          else if (/pants|trouser|bottom|short/i.test(productName)) specs.type = 'pants';
          else if (/tee|t-shirt|shirt/i.test(productName)) specs.type = 'top';
          else if (/vest/i.test(productName)) specs.type = 'vest';
        }
        if (!specs.hasHood && /hood/i.test(productName)) specs.hasHood = true;
      }

      if (category === 'backpack' || category === 'vest_pack') {
        if (!specs.volume) {
          // "Cha-Cha Pack 30" → volume=30
          const volM = productName.match(/\b(\d+)\s*L?\b(?:\s|$)/);
          if (volM) {
            const v = parseInt(volM[1], 10);
            if (v >= 1 && v <= 150) specs.volume = v;
          }
        }
        if (!specs.gender) {
          if (/women'?s|woman/i.test(productName)) specs.gender = 'female';
          else specs.gender = 'unisex';
        }
      }

      // 3. 색상 × 사이즈별로 확장 (스킬 룰: 옵션별 모두 개별 행)
      const colors = p.colors ?? {};
      for (const [colorCode, colorData] of Object.entries(colors)) {
        const colorEnglish = colorData.color_name_en ?? colorCode;
        const imgCode = colorCode.toLowerCase();
        const imageUrl = `${BASE_URL}/storage/products/images/small/${productCode}_${imgCode}.webp`;

        const sizes = Object.entries(colorData.sizes ?? {});
        // sizes가 없으면 원사이즈 1행
        const sizeEntries = sizes.length > 0 ? sizes : [['', { size_name_en: '' }]];

        for (const [, sizeData] of sizeEntries) {
          const sizeEnglish = sizeData.size_name_en ?? '';
          // "One Size" / "-" / "" → 빈값 처리
          const isOneSize = !sizeEnglish || sizeEnglish === '-' || /^one\s*size$/i.test(sizeEnglish);
          const sizeVal = isOneSize ? '' : sizeEnglish;
          // 비색상 옵션(사이즈)을 name 끝에 " / 사이즈"로 부착
          const fullName = sizeVal ? `${productName} / ${sizeVal}` : productName;

          results.push({
            groupId: `montbell_${productCode}`,
            category,
            company: 'montbell',
            companyKorean: '몽벨',
            name: fullName,
            nameKorean: '',
            color: colorEnglish,
            colorKorean: '',
            size: sizeVal,
            sizeKorean: '',
            weight: weightG,
            imageUrl,
            specs,
            _source: categoryUrl,
          });
        }
      }
    }

    return results;
  } catch (e) {
    console.log(`[montbell] error in c=${catId}: ${e.message}`);
    return [];
  } finally {
    await page.close();
  }
};

export default {
  name: 'montbell',
  company: 'montbell',
  baseUrl: BASE_URL,
  defaultCategories: [
    `${BASE_URL}/jp/en/products/list?c=38`, // Backpacks
    `${BASE_URL}/jp/en/products/list?c=34`, // Sleeping Bags & Pads
    `${BASE_URL}/jp/en/products/list?c=35`, // Tents & Shelters
    `${BASE_URL}/jp/en/products/list?c=6`,  // Insulated Clothing
    `${BASE_URL}/jp/en/products/list?c=5`,  // Rainwear
  ],
  crawl: async (browser, { categoryUrls, withWeight = true } = {}) => {
    const urls = categoryUrls?.length
      ? categoryUrls
      : [`${BASE_URL}/jp/en/products/list?c=38`];
    const all = [];
    for (const url of urls) {
      console.log(`[montbell] crawling ${url}`);
      try {
        const items = await crawlCategory(browser, url, { withWeight });
        console.log(`[montbell] ${items.length} items from ${url}`);
        all.push(...items);
      } catch (e) {
        console.log(`[montbell] error on ${url}: ${e.message} — skipping`);
      }
    }
    return all;
  },
};

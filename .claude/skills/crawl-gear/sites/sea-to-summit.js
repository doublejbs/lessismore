// Sea to Summit — https://seatosummit.com
// Shopify site. Uses products.json API for listing + weight (grams field in variants).
// Spec table in detail pages: <th> row labels, <td> values per variant column.
// R-Value and temperature info in feature text (not spec table).

const CATEGORY_MAP = {
  'collections/sleeping-bags': 'sleeping_bag',
  'collections/down-sleeping-bags': 'sleeping_bag',
  'collections/mummy-sleeping-bags': 'sleeping_bag',
  'collections/ultralight-sleeping-bags': 'sleeping_bag',
  'collections/zero-degree-sleeping-bags': 'sleeping_bag',
  'collections/backpacking-sleeping-bags': 'sleeping_bag',
  'collections/synthetic-sleeping-bags': 'sleeping_bag',
  'collections/quilts': 'sleeping_bag',
  'collections/sleeping-bag-liners': 'sleeping_bag',
  'collections/sleeping-pads': 'mat',
  'collections/air-sprung-cell-sleeping-pads': 'mat',
  'collections/backpacking-sleeping-pads': 'mat',
  'collections/camping-sleeping-pads': 'mat',
  'collections/self-inflating-sleeping-pads': 'mat',
  'collections/ultralight-sleeping-pads': 'mat',
  'collections/insulated-sleeping-pads': 'mat',
  'collections/camping-pillows': 'pillow',
  'collections/ultralight-backpacking-tents': 'tent',
  'collections/telos-freestanding-ultralight-tents': 'tent',
  'collections/tents': 'tent',
  'collections/camping-tarps': 'tarp',
  'collections/tent-accessories': 'tent_acc',
  'collections/camping-cookware': 'cookware_etc',
  'collections/camping-cups-mugs': 'cup',
  'collections/camping-bowls': 'bowl',
  'collections/camping-dinnerware': 'bowl',
  'collections/camping-plates': 'bowl',
  'collections/camping-utensils': 'cutlery',
  'collections/dry-bags': 'pouch',
  'collections/dry-bag-backpacks': 'pouch',
  'collections/stuff-sacks': 'pouch',
  'collections/compression-sacks': 'pouch',
  'collections/camping-storage': 'pouch',
  'collections/quick-dry-towels': 'towel',
  'collections/toiletry-bags': 'pouch',
  'collections/packing-cubes-travel-organizers': 'pouch',
};

const guessCategory = (url) => {
  const keys = Object.keys(CATEGORY_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (url.includes(key)) return CATEGORY_MAP[key];
  }
  return null;
};

const slugFromHandle = (handle) => handle.replace(/\//g, '-');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Fetch all products from a Shopify collection via products.json (no browser needed)
const fetchCollectionProducts = async (collectionHandle) => {
  const results = [];
  let page = 1;
  while (true) {
    const url = `https://seatosummit.com/collections/${collectionHandle}/products.json?limit=250&page=${page}`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) break;
      const data = await res.json();
      if (!data.products || data.products.length === 0) break;
      results.push(...data.products);
      if (data.products.length < 250) break;
      page++;
    } catch (e) {
      console.log(`[sea-to-summit] products.json fetch failed: ${e.message}`);
      break;
    }
  }
  return results;
};

const cleanCell = (cell) => {
  const metMatch = cell.match(/<span class="met">([\s\S]*?)<\/span>/);
  return (metMatch ? metMatch[1] : cell)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&times;/g, '×')
    .replace(/\s+/g, ' ')
    .trim();
};

// Parse spec table. Returns { table: { label: [colVals...] }, headers: [colLabels...] }
// Columns are per spec-variant (e.g. by size/temp), NOT per products.json variant —
// a product may have more variants (colours) than spec columns, so callers must map
// each variant to its column via the header labels.
const parseSpecTable = (html) => {
  const table = {};
  let headers = [];
  const trBlocks = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  for (const tr of trBlocks) {
    const cells = tr.match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g) || [];
    if (cells.length < 2) continue;
    const label = cleanCell(cells[0]);
    const vals = cells.slice(1).map(cleanCell);
    if (!label) { if (!headers.length) headers = vals; continue; } // header row (empty first cell)
    table[label] = vals;
  }
  return { table, headers };
};

// Pick the spec column for a variant by matching the column header against the
// variant's distinguishing option values (size/temp; colour is excluded by caller).
const normKey = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const pickColumn = (headers, optionValues) => {
  const keys = optionValues.map(normKey).filter(Boolean);
  if (headers.length <= 1) return 0;
  if (!keys.length) return 0;
  const idx = headers.findIndex((h) => {
    const hn = normKey(h);
    return keys.every((k) => hn.includes(k));
  });
  return idx; // -1 if no column matches
};

const parseWeight = (text) => {
  // Keep exact metric value (no rounding). "527.1 g27.6 oz" → 527.1
  const gM = text.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  if (gM) return parseFloat(gM[1]);
  const kgM = text.match(/(\d+(?:\.\d+)?)\s*kg\b/i);
  if (kgM) return parseFloat(kgM[1]) * 1000;
  const lbOzM = text.match(/(\d+)\s*lb\.?\s+(\d+(?:\.\d+)?)\s*oz/i);
  if (lbOzM) return parseInt(lbOzM[1]) * 453.592 + parseFloat(lbOzM[2]) * 28.3495;
  const ozM = text.match(/(\d+(?:\.\d+)?)\s*oz\b/i);
  if (ozM) return parseFloat(ozM[1]) * 28.3495;
  return 0;
};

// Returns { table, headers, specs }. weight/temp are read per-variant in crawlCategory
// using the matching spec column (headers), since variants ≠ spec columns.
const fetchDetail = async (handle, category, title = '') => {
  const empty = { table: {}, headers: [], specs: {} };
  try {
    const url = `https://seatosummit.com/products/${handle}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return empty;
    const html = await res.text();

    const { table, headers } = parseSpecTable(html);
    const allText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const specs = {};

    // row(label) → first column value helper (for product-wide specs)
    const cell0 = (label) => (table[label]?.[0] ?? '');

    if (category === 'sleeping_bag') {
      // Note: comfortTemp/limitTemp/fillWeight are per-variant — set in crawlCategory.
      if (/goose\s*down|duck\s*down|\d+\s*fill\s*power/i.test(allText)) specs.fillMaterial = 'down';
      else if (/synthetic|primaloft|thermolite/i.test(allText)) specs.fillMaterial = 'synthetic';

      const fpM = allText.match(/(\d{3})\+?\s*fill[\s-]?power/i);
      if (fpM) specs.fillPower = parseInt(fpM[1], 10);

      if (/right[\s-]?hand zip|right\s*zip/i.test(allText)) specs.zipperSide = 'right';
      else if (/left[\s-]?hand zip|left\s*zip/i.test(allText)) specs.zipperSide = 'left';

      if (/quilt/i.test(allText)) specs.shape = 'quilt';
      else if (/mummy/i.test(allText)) specs.shape = 'mummy';
      else if (/semi[\s-]?rec|rectangular/i.test(allText)) specs.shape = 'semi-rectangular';
    }

    if (category === 'mat') {
      const rvM = allText.match(/R[\s-]?[Vv]alue[\s\S]{0,30}?(\d+(?:\.\d+)?)/);
      if (rvM) specs.rValue = parseFloat(rvM[1]);

      // Type from product title (page-wide text catches unrelated linked products)
      const tt = `${title} ${handle}`;
      if (/self[\s-]?inflat/i.test(tt)) specs.type = 'self-inflating';
      else if (/\bair\b|air\s*sprung/i.test(tt)) specs.type = 'air';
      else if (/foam/i.test(tt)) specs.type = 'foam';

      const thM = allText.match(/(\d+(?:\.\d+)?)\s*cm\s*thick/i);
      if (thM) specs.thickness = parseFloat(thM[1]);

      if (/nylon/i.test(allText)) specs.material = 'nylon';
    }

    if (category === 'pillow') {
      if (/down/i.test(allText)) specs.fillMaterial = 'down';
      else if (/inflat/i.test(allText)) specs.type = 'inflatable';
      else if (/foam/i.test(allText)) specs.type = 'foam';
    }

    if (category === 'tent' || category === 'shelter') {
      const capM = handle.match(/(\d+)[\s-]?person/) ?? allText.match(/(\d+)[\s-]?[Pp]erson/);
      if (capM) specs.capacity = parseInt(capM[1], 10);

      const poleM = allText.match(/(?:DAC|carbon|aluminum|alloy)\s*(?:pole|featherlight|NFL|NSL)?/i);
      if (poleM) specs.poleMaterial = poleM[0].trim().slice(0, 80);

      const wpM = allText.match(/(\d{4,5})\s*mm\b/);
      if (wpM) specs.waterproofRating = parseInt(wpM[1], 10);

      const flyM = allText.match(/(\d+D[\s\w]*nylon|silnylon|sil\/pe|DCF|Dyneema)/i);
      if (flyM) specs.flyMaterial = flyM[0].trim().slice(0, 80);

      const vestM = cell0('Vestibule Area').match(/(\d+(?:\.\d+)?)\s*m²/);
      if (vestM) specs.vestibuleArea = parseFloat(vestM[1]);

      if (/double[\s-]?wall/i.test(allText)) specs.wallStructure = 'double';
      else if (/single[\s-]?wall/i.test(allText)) specs.wallStructure = 'single';
    }

    if (category === 'tarp') {
      const wpM = allText.match(/(\d{4,5})\s*mm\b/);
      if (wpM) specs.waterproofRating = parseInt(wpM[1], 10);
      const matM = allText.match(/(\d+D[\s\w]*nylon|silnylon|sil\/pe|DCF|ultra[\s-]?sil)/i);
      if (matM) specs.material = matM[0].trim().slice(0, 80);
    }

    if (category === 'cup' || category === 'bowl' || category === 'cookware_etc') {
      if (/titanium/i.test(allText)) specs.material = 'titanium';
      else if (/aluminum/i.test(allText)) specs.material = 'aluminum';
      else if (/stainless/i.test(allText)) specs.material = 'stainless';
      else if (/polypropylene|plastic|BPA/i.test(allText)) specs.material = 'polypropylene';

      const capRaw = cell0('Capacity') || cell0('Volume');
      const capM = capRaw.match(/(\d+(?:\.\d+)?)\s*[mM][lL]/) ??
                   capRaw.match(/(\d+(?:\.\d+)?)\s*[lL]\b/) ??
                   handle.match(/(\d+)(?:ml|l)\b/i);
      if (capM) {
        const v = parseFloat(capM[1]);
        specs.capacity = /[lL]\b/.test(capM[0]) && v < 10 ? Math.round(v * 1000) : Math.round(v);
      }

      if (/set\b|cook[\s-]?set/i.test(handle) || /set\b|cook[\s-]?set/i.test(allText.slice(0, 500))) specs.isSet = true;
      if (/insulated|double[\s-]?wall/i.test(allText)) specs.isInsulated = true;
    }

    if (category === 'cutlery') {
      if (/titanium/i.test(allText)) specs.material = 'titanium';
      else if (/aluminum/i.test(allText)) specs.material = 'aluminum';
      else if (/stainless/i.test(allText)) specs.material = 'stainless';
      if (/set\b|3[\s-]piece|4[\s-]piece/i.test(handle)) specs.isSet = true;
    }

    if (category === 'pouch') {
      if (/ultra[\s-]?sil|silnylon|nylon/i.test(allText)) specs.material = 'nylon';
      if (/waterproof|dry\s*bag|dry\s*sack/i.test(allText)) specs.isWaterproof = true;
      const volM = (cell0('Volume') || cell0('Capacity')).match(/(\d+(?:\.\d+)?)\s*[lL]\b/) ??
                   handle.match(/(\d+)[lL]\b/i);
      if (volM) specs.capacity = Math.round(parseFloat(volM[1]) * 1000);
    }

    if (category === 'towel') {
      if (/microfibre|microfiber/i.test(allText)) specs.material = 'microfiber';
      else if (/cotton/i.test(allText)) specs.material = 'cotton';
    }

    return { table, headers, specs };
  } catch (e) {
    return empty;
  }
};

const parseTempC = (text) => {
  const m = text.match(/(-?\d+)\s*°C/);
  return m ? parseInt(m[1], 10) : null;
};

const crawlCategory = async (browser, categoryUrl, { withWeight = true } = {}) => {
  const handleM = categoryUrl.match(/collections\/([^/?#]+)/);
  if (!handleM) return [];
  const collectionHandle = handleM[1];
  const category = guessCategory(categoryUrl) ?? 'etc';

  console.log(`[sea-to-summit] fetching collection: ${collectionHandle}`);
  const products = await fetchCollectionProducts(collectionHandle);
  console.log(`[sea-to-summit] ${products.length} products found`);

  const results = [];
  let idx = 0;
  for (const product of products) {
    idx++;
    if (idx === 1 || idx % 20 === 0 || idx === products.length) {
      console.log(`[sea-to-summit]   detail ${idx}/${products.length}`);
    }

    // Get image from first product image
    let baseImageUrl = product.images?.[0]?.src ?? '';
    if (baseImageUrl.startsWith('//')) baseImageUrl = 'https:' + baseImageUrl;
    baseImageUrl = baseImageUrl.split('?')[0];

    // Option name → field mapping
    const optionNames = (product.options ?? []).map((o) => o.name.toLowerCase());
    const colorOptIdx = optionNames.findIndex((n) => /colou?r/.test(n));
    const sizeOptIdx  = optionNames.findIndex((n) => /size/.test(n));

    let baseSpecs = {};
    let table = {};
    let headers = [];
    if (withWeight) {
      const detail = await fetchDetail(product.handle, category, product.title);
      baseSpecs = detail.specs;
      table = detail.table;
      headers = detail.headers;
    }
    // weight row: prefer Packed Weight, then Weight, then Set Weight
    const weightRow = table['Packed Weight'] ?? table['Weight'] ?? table['Set Weight'] ?? [];

    // One entry per variant
    const variants = product.variants ?? [];
    variants.forEach((variant, vi) => {
      const color = colorOptIdx >= 0 ? (variant[`option${colorOptIdx + 1}`] ?? '') : '';

      // "One Size" / "Default Title" mean there is no real size choice → treat as blank.
      const noSize = (v) => !v || /^(one size|default title|default)$/i.test(String(v).trim());
      const size = sizeOptIdx >= 0 && !noSize(variant[`option${sizeOptIdx + 1}`])
        ? variant[`option${sizeOptIdx + 1}`] : '';

      // Combine non-color, non-size options into size label (e.g. "Temp Rating")
      const extraOpts = optionNames
        .map((n, i) => (i !== colorOptIdx && i !== sizeOptIdx && !noSize(variant[`option${i + 1}`]) ? variant[`option${i + 1}`] : null))
        .filter(Boolean);
      const sizeLabel = [size, ...extraOpts].filter(Boolean).join(' / ');

      // Map this variant to its spec column by header (colour is excluded — spec
      // tables don't vary by colour). Fall back to positional index.
      const nonColorVals = optionNames
        .map((n, i) => (i !== colorOptIdx ? variant[`option${i + 1}`] : null))
        .filter(Boolean);
      let col = pickColumn(headers, nonColorVals);
      if (col < 0) col = headers.length === weightRow.length ? -1 : vi; // -1 → unknown, leave 0
      const colIdx = col;

      const weight = colIdx >= 0 ? parseWeight(weightRow[colIdx] ?? '') : 0;

      // Per-variant specs: clone common specs, then fill variant-specific columns.
      const specs = { ...baseSpecs };
      if (category === 'sleeping_bag' && colIdx >= 0) {
        const lower = parseTempC((table['Temperature Rating (ISO Lower)'] ?? table['Temperature Rating'] ?? [])[colIdx] ?? '');
        if (lower !== null) specs.limitTemp = lower;
        const comfort = parseTempC((table["Women's Temperature Rating (ISO Comfort)"] ?? table['Temperature Rating (ISO Comfort)'] ?? [])[colIdx] ?? '');
        if (comfort !== null) specs.comfortTemp = comfort;
        const fwM = ((table['Fill Weight'] ?? [])[colIdx] ?? '').match(/(\d+)\s*g/);
        if (fwM) specs.fillWeight = parseInt(fwM[1], 10);
      }

      // Per-variant (per-colour) image: collection products.json puts it on
      // variant.featured_image; individual product.json uses variant.image_id.
      let imageUrl = baseImageUrl;
      if (variant.featured_image?.src) {
        imageUrl = variant.featured_image.src.split('?')[0];
      } else if (variant.image_id) {
        const img = product.images?.find((im) => im.id === variant.image_id);
        if (img) imageUrl = img.src.split('?')[0];
      }

      results.push({
        groupId: `sea-to-summit_${slugFromHandle(product.handle)}`,
        category,
        company: 'sea-to-summit',
        companyKorean: '씨투써밋',
        name: sizeLabel ? `${product.title} ${sizeLabel}` : product.title,
        nameKorean: '',
        color,
        colorKorean: '',
        size: sizeLabel,
        sizeKorean: '',
        weight,
        imageUrl,
        specs,
        _source: categoryUrl,
      });
    });
  }
  return results;
};

export default {
  name: 'sea-to-summit',
  company: 'sea-to-summit',
  baseUrl: 'https://seatosummit.com',
  defaultCategories: [
    'https://seatosummit.com/collections/sleeping-bags',
    'https://seatosummit.com/collections/sleeping-pads',
    'https://seatosummit.com/collections/camping-pillows',
    'https://seatosummit.com/collections/ultralight-backpacking-tents',
    'https://seatosummit.com/collections/camping-tarps',
    'https://seatosummit.com/collections/tent-accessories',
    'https://seatosummit.com/collections/camping-cookware',
    'https://seatosummit.com/collections/camping-cups-mugs',
    'https://seatosummit.com/collections/camping-bowls',
    'https://seatosummit.com/collections/camping-utensils',
    'https://seatosummit.com/collections/dry-bags',
    'https://seatosummit.com/collections/stuff-sacks',
    'https://seatosummit.com/collections/quick-dry-towels',
  ],
  crawl: async (browser, { categoryUrls, withWeight = true } = {}) => {
    const urls = categoryUrls?.length ? categoryUrls : [
      'https://seatosummit.com/collections/sleeping-bags',
      'https://seatosummit.com/collections/sleeping-pads',
      'https://seatosummit.com/collections/camping-pillows',
      'https://seatosummit.com/collections/ultralight-backpacking-tents',
      'https://seatosummit.com/collections/camping-tarps',
      'https://seatosummit.com/collections/tent-accessories',
      'https://seatosummit.com/collections/camping-cookware',
      'https://seatosummit.com/collections/camping-cups-mugs',
      'https://seatosummit.com/collections/camping-bowls',
      'https://seatosummit.com/collections/camping-utensils',
      'https://seatosummit.com/collections/dry-bags',
      'https://seatosummit.com/collections/stuff-sacks',
      'https://seatosummit.com/collections/quick-dry-towels',
    ];
    const all = [];
    for (const url of urls) {
      console.log(`[sea-to-summit] crawling ${url}`);
      try {
        const items = await crawlCategory(browser, url, { withWeight });
        console.log(`[sea-to-summit] ${items.length} items from ${url}`);
        all.push(...items);
      } catch (e) {
        console.log(`[sea-to-summit] error on ${url}: ${e.message} — skipping`);
      }
    }
    // Deduplicate by groupId+size+color (same variant may appear in multiple collections)
    const seen = new Set();
    return all.filter((item) => {
      const key = `${item.groupId}|${item.size}|${item.color}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },
};

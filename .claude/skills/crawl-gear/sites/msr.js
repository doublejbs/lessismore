// MSR (via Cascade Designs) — https://cascadedesigns.com/
// Shopify-based site that sells MSR + Thermarest + Platypus + PackTowl + SealLine.
// Filter by data-product-brand="MSR" on listing cards.
// Product details rendered as feature bullets in <ul> under .product__product_details.

const CATEGORY_MAP = {
  'collections/tents': 'tent',
  'collections/backpacking-tents': 'tent',
  'collections/all-season-tents': 'tent',
  'collections/camping-frontcountry-tents': 'tent',
  'collections/access-series-tents': 'tent',
  'collections/elixir-series-tents': 'tent',
  'collections/stoves': 'stove',
  'collections/canister-stoves': 'stove',
  'collections/cookware': 'cookware_etc',
  'collections/cook-sets': 'cookware_etc',
  'collections/camp-kitchen-utensils': 'cookware_etc',
  'collections/water-treatment': 'bottle',
  'collections/filtration': 'bottle',
  'collections/filters-and-purifiers': 'bottle',
  'collections/bottles': 'bottle',
  'collections/hydration-reservoirs': 'bottle',
  'collections/snowshoes': 'microspikes',
  'collections/snow-tools': 'shovel',
  'collections/avalanche-shovels': 'shovel',
  'collections/avalanche-probes': 'etc',
  'collections/trekking-poles': 'trekking_pole',
};

const guessCategory = (url) => {
  const keys = Object.keys(CATEGORY_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (url.includes(key)) return CATEGORY_MAP[key];
  }
  return null;
};

const slugFromUrl = (url) => {
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\/products\//, '').replace(/\/$/, '');
  } catch (e) {
    return '';
  }
};

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const extractMaxPage = async (page) => {
  return page.evaluate(() => {
    const links = document.querySelectorAll('.pagination a, nav.pagination a, .pagination__list a');
    let max = 1;
    links.forEach((a) => {
      const n = parseInt(a.textContent.trim(), 10);
      if (Number.isInteger(n) && n > max) max = n;
    });
    // Also check rel=next or page=N in hrefs
    document.querySelectorAll('a[href*="page="]').forEach((a) => {
      const m = a.href.match(/page=(\d+)/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > max) max = n;
      }
    });
    return max;
  });
};

const extractListing = async (page) => {
  return page.evaluate(() => {
    const cards = document.querySelectorAll('.card-wrapper[data-product-brand="MSR"]');
    return Array.from(cards).map((card) => {
      const name = card.getAttribute('data-product-name') ?? '';
      const link = card.querySelector('a[href*="/products/"]');
      const img = card.querySelector('img');
      let imageUrl = img?.getAttribute('src') ?? '';
      if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
      // Strip srcset width parameter to get largest, but src is fine for thumbnail
      return {
        name,
        detailUrl: link?.href ?? '',
        imageUrl,
      };
    }).filter((c) => c.detailUrl);
  });
};

const parseWeight = (text) => {
  // Try kg first (metric), fall back to lb/oz
  const kgM = text.match(/(\d+(?:\.\d+)?)\s*kg/i);
  if (kgM) return Math.round(parseFloat(kgM[1]) * 1000);
  const gM = text.match(/(\d+(?:\.\d+)?)\s*g(?:rams)?\b/i);
  if (gM) return Math.round(parseFloat(gM[1]));
  // Imperial: "2 lb. 6 oz" or "X lb. Y oz" or "X lb" or "Y oz"
  const lbOzM = text.match(/(\d+)\s*lb\.?\s+(\d+)\s*oz/i);
  if (lbOzM) {
    const g = parseInt(lbOzM[1], 10) * 453.592 + parseInt(lbOzM[2], 10) * 28.3495;
    return Math.round(g);
  }
  const lbM = text.match(/(\d+(?:\.\d+)?)\s*lb\b/i);
  if (lbM) return Math.round(parseFloat(lbM[1]) * 453.592);
  const ozM = text.match(/(\d+(?:\.\d+)?)\s*oz\b/i);
  if (ozM) return Math.round(parseFloat(ozM[1]) * 28.3495);
  return 0;
};

const fetchDetail = async (page, detailUrl, category) => {
  const empty = { weight: 0, specs: {}, nameEnglish: '' };
  if (!detailUrl) return empty;
  try {
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 800));

    // Trigger Tech Specs tab to lazy-load its grid table content
    await page.evaluate(() => {
      const tabs = document.querySelectorAll('.tabbed-column__tab, h3.btn-link, .tab-header-text');
      for (const t of tabs) {
        if (t.textContent.includes('Tech Specs')) {
          t.click();
          break;
        }
      }
    });
    await new Promise((r) => setTimeout(r, 1500));

    return page.evaluate((cat) => {
      // Helper inline (browser context)
      const parseWeightFn = (text) => {
        const kgM = text.match(/(\d+(?:\.\d+)?)\s*kg/i);
        if (kgM) return Math.round(parseFloat(kgM[1]) * 1000);
        const lbOzM = text.match(/(\d+)\s*lb\.?\s+(\d+)\s*oz/i);
        if (lbOzM) return Math.round(parseInt(lbOzM[1]) * 453.592 + parseInt(lbOzM[2]) * 28.3495);
        const lbM = text.match(/(\d+(?:\.\d+)?)\s*lb\b/i);
        if (lbM) return Math.round(parseFloat(lbM[1]) * 453.592);
        const ozM = text.match(/(\d+(?:\.\d+)?)\s*oz\b/i);
        if (ozM) return Math.round(parseFloat(ozM[1]) * 28.3495);
        return 0;
      };

      // Primary spec source: Tech Specs structured grid (title/value pairs)
      const techSpecs = {};
      document.querySelectorAll('.product-specs-two-grid .grid-item').forEach((gi) => {
        const title = gi.querySelector('.grid-item-title')?.textContent.trim().replace(/:$/, '') ?? '';
        const value = gi.querySelector('.grid-item-value')?.textContent.trim() ?? '';
        if (title && value) techSpecs[title.toLowerCase()] = value;
      });

      // Secondary: feature bullets (Hubba Hubba etc. have weight in bullet sentences)
      const features = Array.from(
        document.querySelectorAll(
          '.product__product_details ul li, .product-description ul li, .product__description ul li, .product__info ul li'
        )
      ).map((li) => li.textContent.replace(/\s+/g, ' ').trim());

      // Broader text fallback
      const productInfo = document.querySelector(
        '.product__info-wrapper, .product__info, .product__description, .product-info, main .product'
      );
      const broadText = productInfo
        ? productInfo.innerText.replace(/\s+/g, ' ').slice(0, 10000)
        : document.body.innerText.replace(/\s+/g, ' ').slice(0, 10000);

      const featureText =
        Object.entries(techSpecs).map(([k, v]) => `${k}: ${v}`).join('\n') +
        '\n' + features.join('\n') +
        '\n' + broadText;
      // Product title — prefer specific selectors, avoid header/nav h1
      const titleEl =
        document.querySelector('.product__title h1, .product-info__title, h1.product__title, [data-product-title]') ??
        Array.from(document.querySelectorAll('h1')).find((h) => !h.closest('header, nav'));
      const title = titleEl?.textContent.trim() ?? '';

      const weight = parseWeightFn(featureText);

      // Find feature with given label prefix (e.g., "Lightweight:", "Durable Poles:")
      const featureByLabel = (regex) => {
        const f = features.find((line) => regex.test(line));
        if (!f) return '';
        return f.replace(regex, '').trim();
      };

      const specs = {};

      if (cat === 'tent' || cat === 'shelter' || cat === 'tarp') {
        // Prefer Tech Specs grid values
        if (techSpecs.capacity) specs.capacity = parseInt(techSpecs.capacity, 10);
        else {
          const capM = title.match(/(\d+)\s*-?\s*Person/i);
          if (capM) specs.capacity = parseInt(capM[1], 10);
        }
        const poleSpec = techSpecs['pole material'] ?? techSpecs.poles;
        if (poleSpec) specs.poleMaterial = poleSpec.slice(0, 120);
        else {
          const poles = featureByLabel(/^(?:Durable Poles|Poles|Strong Poles):\s*/i);
          if (poles) specs.poleMaterial = poles.slice(0, 120);
        }
        const flySpec = techSpecs['rainfly fabric'] ?? techSpecs['fly fabric'] ?? techSpecs.rainfly;
        if (flySpec) specs.flyMaterial = flySpec.slice(0, 120);
        else {
          const fabric = featureByLabel(/^(?:Responsible Fabrics|Premium Fabrics|Fabric|Weatherproof):\s*/i);
          if (fabric) specs.flyMaterial = fabric.slice(0, 120);
        }
        const innerSpec = techSpecs['canopy fabric'] ?? techSpecs.canopy ?? techSpecs['mesh fabric'];
        if (innerSpec) specs.innerMaterial = innerSpec.slice(0, 120);
        const floorSpec = techSpecs['floor fabric'] ?? techSpecs.floor;
        if (floorSpec && !specs.flyMaterial) specs.flyMaterial = floorSpec.slice(0, 120);
        const peakSpec = techSpecs['peak height'] ?? techSpecs['interior peak height'];
        if (peakSpec) {
          const m = peakSpec.match(/(\d+(?:\.\d+)?)\s*(cm|in)/i);
          if (m) specs.peakHeight = /in/i.test(m[2]) ? Math.round(parseFloat(m[1]) * 2.54) : parseFloat(m[1]);
        }
        const wpM = featureText.match(/(\d{4,5})\s*mm\b/);
        if (wpM) specs.waterproofRating = parseInt(wpM[1], 10);
      }

      if (cat === 'stove' || cat === 'torch') {
        if (/canister/i.test(title) || /canister/i.test(featureText)) specs.fuelType = 'gas';
        else if (/liquid\s*fuel|white\s*gas/i.test(title) || /liquid\s*fuel/i.test(featureText)) specs.fuelType = 'liquid';
        else if (/multi.*fuel/i.test(title) || /multi.*fuel/i.test(featureText)) specs.fuelType = 'multi';
        if (/titanium/i.test(featureText)) specs.material = 'titanium';
        else if (/aluminum|hard.anodized/i.test(featureText)) specs.material = 'aluminum';
        else if (/stainless/i.test(featureText)) specs.material = 'stainless';
        const ignF = featureByLabel(/^(?:Push.button.ignition|Ignition):\s*/i);
        if (ignF || /piezo|push.button.ignition/i.test(featureText)) specs.ignition = 'piezo';
        if (/windscreen/i.test(featureText)) specs.hasWindscreen = true;
        const outM = featureText.match(/(\d+(?:,\d+)?)\s*BTU/i);
        if (outM) specs.output = parseInt(outM[1].replace(/,/g, ''), 10);
      }

      if (cat === 'cookware_etc' || cat === 'cup' || cat === 'bowl' || cat === 'cutlery') {
        if (/titanium/i.test(title) || /titanium/i.test(featureText)) specs.material = 'titanium';
        else if (/hard.anodized|aluminum/i.test(title) || /hard.anodized|aluminum/i.test(featureText)) specs.material = 'aluminum';
        else if (/stainless/i.test(title) || /stainless/i.test(featureText)) specs.material = 'stainless';
        const lM = featureText.match(/(\d+(?:\.\d+)?)\s*L\b/);
        if (lM) specs.capacity = Math.round(parseFloat(lM[1]) * 1000);
        if (/set\b|cook\s*set/i.test(title)) specs.isSet = true;
      }

      if (cat === 'bottle') {
        const lM = featureText.match(/(\d+(?:\.\d+)?)\s*L\b/i) ?? title.match(/(\d+(?:\.\d+)?)\s*L\b/i);
        if (lM) specs.capacity = Math.round(parseFloat(lM[1]) * 1000);
        if (/insulated|vacuum/i.test(featureText)) specs.isInsulated = true;
        if (/wide.mouth|wide\s*mouth/i.test(featureText)) specs.mouthType = 'wide';
        else if (/narrow.mouth|narrow\s*mouth/i.test(featureText)) specs.mouthType = 'narrow';
      }

      if (cat === 'trekking_pole') {
        if (/carbon/i.test(featureText)) specs.material = 'carbon';
        else if (/aluminum|7075|6061/i.test(featureText)) specs.material = 'aluminum';
        if (/folding|fold/i.test(featureText)) specs.foldType = 'folding';
        else if (/telescoping|telescopic/i.test(featureText)) specs.foldType = 'telescopic';
        const lengths = [...featureText.matchAll(/(\d+(?:\.\d+)?)\s*cm/g)].map((m) => parseFloat(m[1]));
        if (lengths.length >= 2) {
          specs.minLength = Math.min(...lengths);
          specs.maxLength = Math.max(...lengths);
        }
      }

      if (cat === 'microspikes' || cat === 'shovel') {
        if (/aluminum/i.test(featureText)) specs.material = 'aluminum';
        else if (/steel/i.test(featureText)) specs.material = 'steel';
        else if (/polycarbonate|plastic/i.test(featureText)) specs.material = 'polycarbonate';
      }

      return { weight, specs, nameEnglish: title };
    }, category);
  } catch (e) {
    return empty;
  }
};

const buildPageUrl = (categoryUrl, pageNum) => {
  if (pageNum <= 1) return categoryUrl;
  const sep = categoryUrl.includes('?') ? '&' : '?';
  return `${categoryUrl}${sep}page=${pageNum}`;
};

const crawlCategory = async (browser, categoryUrl, { withWeight = true } = {}) => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent(UA);
  try {
    await page.goto(categoryUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.log(`[msr] navigation failed: ${categoryUrl} - ${e.message}`);
    await page.close();
    return [];
  }
  await new Promise((r) => setTimeout(r, 1500));

  const maxPage = await extractMaxPage(page);
  const items = await extractListing(page);

  if (maxPage > 1) {
    console.log(`[msr]   ${maxPage} pages detected for ${categoryUrl}`);
    for (let n = 2; n <= maxPage; n += 1) {
      const pageUrl = buildPageUrl(categoryUrl, n);
      try {
        await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise((r) => setTimeout(r, 800));
        const more = await extractListing(page);
        items.push(...more);
      } catch (e) {
        console.log(`[msr]   page ${n} failed: ${e.message}`);
      }
    }
  }

  if (items.length === 0) {
    await page.close();
    return [];
  }

  const category = guessCategory(categoryUrl) ?? 'etc';
  const results = [];
  let idx = 0;
  for (const it of items) {
    idx += 1;
    let weight = 0;
    let specs = {};
    let nameEn = '';
    if (withWeight && it.detailUrl) {
      if (idx === 1 || idx % 5 === 0 || idx === items.length) {
        console.log(`[msr]   detail ${idx}/${items.length}`);
      }
      const detail = await fetchDetail(page, it.detailUrl, category);
      weight = detail.weight;
      specs = detail.specs;
      nameEn = detail.nameEnglish;
    }
    results.push({
      groupId: `msr_${slugFromUrl(it.detailUrl)}`,
      category,
      company: 'msr',
      companyKorean: '엠에스알',
      name: nameEn || it.name,
      nameKorean: '',
      color: '',
      colorKorean: '',
      size: '',
      sizeKorean: '',
      weight,
      imageUrl: it.imageUrl,
      specs,
      _source: categoryUrl,
    });
  }
  try { await page.close(); } catch (_) {}
  return results;
};

export default {
  name: 'msr',
  company: 'msr',
  baseUrl: 'https://cascadedesigns.com',
  defaultCategories: [
    'https://cascadedesigns.com/collections/tents',
    'https://cascadedesigns.com/collections/stoves',
    'https://cascadedesigns.com/collections/cookware',
  ],
  crawl: async (browser, { categoryUrls, withWeight = true } = {}) => {
    const urls = categoryUrls?.length ? categoryUrls : ['https://cascadedesigns.com/collections/tents'];
    const all = [];
    for (const url of urls) {
      console.log(`[msr] crawling ${url}`);
      try {
        const items = await crawlCategory(browser, url, { withWeight });
        console.log(`[msr] ${items.length} items from ${url}`);
        all.push(...items);
      } catch (e) {
        console.log(`[msr] error on ${url}: ${e.message} — skipping`);
      }
    }
    return all;
  },
};

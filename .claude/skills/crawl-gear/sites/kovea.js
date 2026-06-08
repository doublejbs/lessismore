// Kovea (코베아) — kovea.co.kr, Cafe24 shopping mall. Korean camping brand.
// Listing: /product/list.html?cate_no=N&page=P  (JS-rendered grid → puppeteer)
//   product cards: ul.prductList li, detail links /product/<korean-slug>/<no>/...
// Detail spec is embedded in tall description IMAGES on koveaimage.cafe24.com
//   (KOVEA/<YYYY_MM>/<CODE>/<CODE>_NN.jpg). Specs live in the Korean "상품 정보 제공 고시"
//   table (and sometimes an English "Specification" block) near the BOTTOM of the last
//   image. The adapter only collects listing + `_specImages`; OCR extraction of weight/
//   specs is a separate step → kovea-specs.py (fills weight + specs on the crawl JSON).
const BASE = 'https://www.kovea.co.kr';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// cate_no → internal category key (major categories first)
const CATEGORY_MAP = {
  588: 'tent', 901: 'tent', 587: 'tent',
  602: 'tarp',
  596: 'tent_acc', 665: 'tent_acc',
  607: 'chair',
  612: 'table',
  641: 'sleeping_bag',
  644: 'mat',
  624: 'lighting', 670: 'lighting',
  619: 'stove',
  631: 'torch',
  628: 'etc', 634: 'etc',
  650: 'cookware_etc', 654: 'cookware_etc', 659: 'cookware_etc',
  661: 'pouch',
  669: 'etc', 674: 'etc',
};

const catOf = (url) => {
  const m = String(url).match(/cate_no=(\d+)/);
  return m ? (CATEGORY_MAP[Number(m[1])] ?? 'etc') : 'etc';
};

const slugToName = (slug) =>
  decodeURIComponent(slug).replace(/-/g, ' ').replace(/\s+/g, ' ').trim();

const SIZE_KO = {
  XS: '엑스스몰', S: '스몰', M: '미디엄', L: '라지', XL: '엑스라지',
  XXL: '투엑스라지', '2XL': '투엑스라지', '3XL': '쓰리엑스라지',
};
// Kovea ships each colour/size as its own product, baking the variant into the name —
// e.g. "아모르 Ⅱ M (다크그레이)", "가죽 테이블보 M", "T코어 (블랙)". Pull them out.
const COLOR_KW = ['다크그레이', '라이트그레이', '그레이지', '그레이', '차콜', '블랙', '화이트', '아이보리',
  '카키그린', '카키', '카모', '다크네이비', '네이비', '세이지', '올리브', '포레스트', '그린',
  '스카이블루', '블루', '레드', '오렌지', '옐로우', '머스타드', '다크브라운', '브라운', '코요테',
  '모카', '크림', '샌드', '탄', '베이지', '핑크', '퍼플', '라벤더', '버건디', '와인', '골드', '실버', '민트', '코랄'];
const findColor = (s) => COLOR_KW.find((c) => s === c || s.includes(c)) || '';
const extractVariant = (name) => {
  let color = '';
  let base = name;
  const paren = name.match(/\(([^)]+)\)\s*$/);
  if (paren) {
    const c = findColor(paren[1].trim());
    if (c) { color = paren[1].trim(); base = name.replace(/\s*\([^)]*\)\s*$/, '').trim(); }
  }
  if (!color) {
    const last = base.split(/\s+/).pop();
    if (last && findColor(last) === last) { color = last; base = base.replace(/\s+\S+$/, '').trim(); }
  }
  const sm = base.match(/\s(XS|S|M|L|XL|XXL|2XL|3XL)$/i);
  return { color, size: sm ? sm[1].toUpperCase() : '' };
};

// Fetch the detail page: real Korean name (og:title — keeps '.', '~' that the URL slug
// drops) + the koveaimage CDN description image sequence.
const fetchDetail = async (productNo) => {
  try {
    const r = await fetch(`${BASE}/product/x/${productNo}/`, { headers: { 'User-Agent': UA } });
    const html = await r.text();
    const nm = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
    const name = nm ? nm[1].replace(/\s*-\s*코베아\s*$/, '').replace(/\s+/g, ' ').trim() : '';
    // Detail/description images live on the koveaimage CDN OR /web/upload (NNEditor etc.).
    // Collect both; drop UI chrome (icons, menus, banners, tiny custom_*, list thumbnails).
    const imgs = [];
    for (const m of html.matchAll(/koveaimage\.cafe24\.com\/[^"'\s)]+\.(?:jpg|jpeg|png)/gi)) {
      imgs.push('https://' + m[0]);
    }
    for (const m of html.matchAll(/(?:src|ec-data-src)=["']([^"']*?\/web\/upload\/[^"']+\.(?:jpg|jpeg|png))/gi)) {
      let u = m[1];
      if (/\/category\/|icon|menu|btn|common|custom_\d|sns_|logo/i.test(u)) continue;
      if (u.startsWith('//')) u = 'https:' + u;
      else if (u.startsWith('/')) u = BASE + u;
      imgs.push(u);
    }
    return { name, specImages: [...new Set(imgs)] };
  } catch {
    return { name: '', specImages: [] };
  }
};

const extractListing = async (page) =>
  page.evaluate(() => {
    const lis = [...document.querySelectorAll('ul.prductList > li')];
    const out = [];
    for (const li of lis) {
      const a = li.querySelector('a[href*="/product/"]');
      if (!a) continue;
      const m = a.getAttribute('href').match(/\/product\/([^/]+)\/(\d+)\//);
      if (!m) continue;
      const slug = m[1];
      if (['big', 'medium', 'small', 'tiny'].includes(slug) || /^\d+$/.test(slug)) continue;
      const img = li.querySelector('img');
      let imageUrl = img ? (img.getAttribute('ec-data-src') || img.getAttribute('src') || '') : '';
      imageUrl = imageUrl.replace(/^\/\//, 'https://').split('?')[0];
      if (imageUrl.startsWith('/')) imageUrl = location.origin + imageUrl;
      out.push({ no: m[2], slug, imageUrl });
    }
    return out;
  });

const getMaxPage = async (page) =>
  page.evaluate(() => {
    const nums = [...document.querySelectorAll('.xans-product-normalpaging a, [class*="paging"] a, .ec-base-paginate a')]
      .map((a) => parseInt(a.textContent.trim(), 10)).filter((n) => !Number.isNaN(n));
    return nums.length ? Math.max(...nums) : 1;
  });

const crawlCategory = async (browser, categoryUrl) => {
  const category = catOf(categoryUrl);
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setViewport({ width: 1280, height: 1000 });

  const seen = new Map(); // no → {slug, imageUrl}
  try {
    await page.goto(categoryUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('ul.prductList > li', { timeout: 15000 }).catch(() => {});
    const maxPage = await getMaxPage(page);
    for (let p = 1; p <= maxPage; p++) {
      if (p > 1) {
        const u = new URL(categoryUrl);
        u.searchParams.set('page', String(p));
        await page.goto(u.toString(), { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForSelector('ul.prductList > li', { timeout: 15000 }).catch(() => {});
      }
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise((r) => setTimeout(r, 800));
      const items = await extractListing(page);
      let fresh = 0;
      for (const it of items) {
        if (it.slug === '트랜스업세트') continue; // pinned promo repeated on every page
        if (!seen.has(it.no)) { seen.set(it.no, it); fresh++; }
      }
      console.log(`[kovea]   ${category} page ${p}/${maxPage}: +${fresh} (total ${seen.size})`);
      if (p > 1 && fresh === 0) break;
    }
  } catch (e) {
    console.log(`[kovea] listing error ${categoryUrl}: ${e.message}`);
  } finally {
    await page.close();
  }

  const results = [];
  let i = 0;
  for (const [no, it] of seen) {
    i++;
    const detail = await fetchDetail(no);
    if (i % 10 === 0) console.log(`[kovea]   ${category} detail ${i}/${seen.size}`);
    // nameKorean = real product name (og:title); English name left empty (Korean brand).
    const nameKorean = detail.name || slugToName(it.slug);
    const { color, size } = extractVariant(nameKorean);
    results.push({
      groupId: `kovea_${no}`,
      category,
      company: 'kovea',
      companyKorean: '코베아',
      name: '',
      nameKorean,
      color: '',
      colorKorean: color,
      size,
      sizeKorean: size ? (SIZE_KO[size] || size) : '',
      weight: 0,
      imageUrl: it.imageUrl,
      specs: {},
      _productNo: no,
      _detailUrl: `${BASE}/product/${it.slug}/${no}/`,
      _specImages: detail.specImages,
      _source: categoryUrl,
    });
  }
  return results;
};

export default {
  name: 'kovea',
  company: 'kovea',
  baseUrl: BASE,
  defaultCategories: [
    `${BASE}/product/list.html?cate_no=588`, // 텐트
    `${BASE}/product/list.html?cate_no=602`, // 타프
    `${BASE}/product/list.html?cate_no=607`, // 체어
    `${BASE}/product/list.html?cate_no=612`, // 테이블
    `${BASE}/product/list.html?cate_no=641`, // 침낭
    `${BASE}/product/list.html?cate_no=644`, // 매트
    `${BASE}/product/list.html?cate_no=670`, // 랜턴
  ],
  crawl: async (browser, { categoryUrls } = {}) => {
    const urls = categoryUrls?.length ? categoryUrls : [`${BASE}/product/list.html?cate_no=588`];
    const all = [];
    for (const url of urls) {
      console.log(`[kovea] crawling ${url}`);
      try {
        const items = await crawlCategory(browser, url);
        console.log(`[kovea] ${items.length} items from ${url}`);
        all.push(...items);
      } catch (e) {
        console.log(`[kovea] error on ${url}: ${e.message} — skipping`);
      }
    }
    return all;
  },
};

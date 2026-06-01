// NEMO (via MK Outdoor 한국 공식 유통) — https://www.nemoequipment.co.kr/
// 고도몰(godomall) 기반 PHP 쇼핑몰. 멀티브랜드 사이트지만 cateCd=001* 가 니모.
//
// 사이트 특이사항:
// - 리스팅: goods_list.php?cateCd=CODE, 카드 = li > div.item_cont, 페이지당 24개, 페이지네이션 &page=N
// - 무게/스펙은 구조화 텍스트에 없음("상세페이지 참고"). 상세페이지 하단의
//   "상품정보제공고시" 가 박힌 초장축 세로 이미지(width≈860, height>>width)에만 존재.
//   → 이 어댑터는 그 고시 이미지 URL(_specImage)만 수집하고,
//     weight/specs 는 별도 비전(Phase B) 단계에서 채운다.
// - 고시 이미지는 lazy-load 라 상세페이지 풀스크롤 후에만 DOM 에 뜬다.
// - 색상은 상세 좌측 정보고시 테이블(table.left_table_type)의 모델명 "제품명 - 색상" 에서 추출.

const CATEGORY_MAP = {
  // All-product(그룹 전체) 코드 — Part 2(한국한정) 수집용. 카테고리는 후처리에서 제품별 재지정.
  '001001012': 'tent',
  '001003007': 'sleeping_bag',
  '001008005': 'chair',
  // Tent (001001)
  '001001001': 'tent',        // Ultralight
  '001001002': 'tent',        // Backpacking
  '001001006': 'tent',        // Ultralight_NEW
  '001001007': 'tent',        // Backpacking_NEW
  '001001010': 'tent',        // Mountaineering
  '001001011': 'shelter',     // Shelters
  '001001009': 'tent_acc',    // Accessories
  // Sleeping Pads (001002)
  '001002002': 'mat',         // Backpacking
  '001002003': 'mat',         // Mountaineering
  '001002007': 'mat',         // Ultralight
  '001002008': 'mat',         // Car Camping
  '001002004': 'pillow',      // Fillo™
  // Sleeping Bags (001003)
  '001003001': 'sleeping_bag',
  '001003002': 'sleeping_bag',
  '001003003': 'sleeping_bag',
  '001003004': 'etc',         // Sleeping Bag Liners (라이너 → etc)
  // Furniture (001008)
  '001008002': 'chair',       // Chairs
  '001008003': 'table',       // Tables
  '001008001': 'etc',         // Accessories
  '001008004': 'etc',         // Showers
  // Packs & Duffels (001009)
  '001009001': 'backpack',    // Backpacks
  '001009003': 'pouch',       // Duffels
};

const cateCdFromUrl = (url) => {
  const m = String(url).match(/cateCd=([0-9]+)/);

  return m ? m[1] : '';
};

const guessCategory = (url) => {
  const code = cateCdFromUrl(url);
  // 정확 매치 우선, 없으면 가장 긴 prefix 매치
  if (CATEGORY_MAP[code]) {
    return CATEGORY_MAP[code];
  }

  const keys = Object.keys(CATEGORY_MAP).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    if (code.startsWith(key) || key.startsWith(code)) {
      return CATEGORY_MAP[key];
    }
  }

  return 'etc';
};

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const slugFromName = (name) =>
  name
    .replace(/^\[[^\]]*\]/, '') // [니모] 접두 제거
    .replace(/™|®/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');

// 사이즈 토큰(접미사가 이것이면 사이즈, 아니면 색상으로 본다)
const SIZE_RE = /^(숏|레귤러|롱|와이드|머미|레귤러\/와이드|롱\/와이드|레귤러\/머미|와이드\/롱|숏\/머미)$/;

// 리스팅 이름 "[니모] 제품명 - 접미사" 를 base/size/color 로 분리.
// 접미사가 사이즈면 이름에 유지(사이즈 변형은 별도 제품), 색상이면 이름에서 떼어 colorKorean 으로.
const splitName = (raw) => {
  let name = raw.replace(/^\[[^\]]*\]\s*/, '').trim();
  let sizeKorean = '';
  let colorKorean = '';
  const dash = name.lastIndexOf(' - ');

  if (dash > 0) {
    const suffix = name.slice(dash + 3).trim();

    if (SIZE_RE.test(suffix)) {
      sizeKorean = suffix;
      name = `${name.slice(0, dash).trim()} ${suffix}`;
    } else {
      colorKorean = suffix;
      name = name.slice(0, dash).trim();
    }
  }

  return { name, sizeKorean, colorKorean };
};

const extractMaxPage = async (page) =>
  page.evaluate(() => {
    let max = 1;

    document.querySelectorAll('.pagination a, .scr_paging a').forEach((a) => {
      const n = parseInt(a.textContent.trim(), 10);

      if (Number.isInteger(n) && n > max) {
        max = n;
      }

      const m = (a.getAttribute('href') || '').match(/page=(\d+)/);

      if (m) {
        const pn = parseInt(m[1], 10);

        if (pn > max) {
          max = pn;
        }
      }
    });

    return max;
  });

const extractListing = async (page) =>
  page.evaluate(() => {
    const cards = document.querySelectorAll('div.item_cont');

    return Array.from(cards)
      .map((card) => {
        const link = card.querySelector('a[href*="goods_view.php"]');
        const nameEl = card.querySelector('.item_name');
        const img = card.querySelector('.item_photo_box img, img.middle, img');
        let imageUrl = img?.getAttribute('src') || img?.getAttribute('data-src') || '';

        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        }

        return {
          name: (nameEl?.textContent || '').replace(/\s+/g, ' ').trim(),
          detailUrl: link?.href || '',
          imageUrl,
        };
      })
      .filter((c) => c.detailUrl && c.name)
      // "OOO 시리즈" 랜딩 카드는 개별 제품과 중복되므로 제외
      .filter((c) => !/시리즈/.test(c.name));
  });

// 상세페이지: 색상(모델명) + 고시 이미지 URL 추출 (무게/스펙은 비전 단계에서)
const fetchDetail = async (page, detailUrl) => {
  const empty = { colorKorean: '', specImage: '', nameKorean: '' };

  if (!detailUrl) {
    return empty;
  }

  try {
    await page.goto(detailUrl, { waitUntil: 'networkidle2', timeout: 40000 });
    await new Promise((r) => setTimeout(r, 600));

    // 고시(통짜 세로) 이미지는 lazy-load + 대형(수만 px)이라 디코드까지 시간이 걸린다.
    // data-src 적용 + 단계 스크롤하며 최대 14초까지 폴링: 세로로 긴 hgodo 이미지가
    // naturalHeight 로 잡히면 즉시 종료.
    await page.evaluate(async () => {
      // 고시(통짜 세로) 이미지: 세로로 길고(가로 비율 1.5배+) 가로 300px 이상,
      // 스킨 배너 CDN(nhncommerce)은 제외. 호스트는 hgodo / esmplus 등 다양.
      const isSpec = (i) => {
        const s = i.src || '';

        return (
          /^https?:/.test(s) &&
          !/nhncommerce/i.test(s) &&
          i.naturalWidth > 300 &&
          i.naturalHeight > i.naturalWidth * 1.5
        );
      };

      const loaded = () => [...document.querySelectorAll('img')].some(isSpec);

      for (let k = 0; k < 14; k += 1) {
        document.querySelectorAll('img[data-src]').forEach((i) => {
          if (!i.src) {
            i.src = i.getAttribute('data-src');
          }
        });
        window.scrollTo(0, document.body.scrollHeight * (k % 2 ? 0.5 : 1));

        if (loaded()) {
          break;
        }

        await new Promise((r) => setTimeout(r, 1000));
      }
    });

    return page.evaluate(() => {
      // 모델명 → 색상 + 한글명
      let modelName = '';

      document.querySelectorAll('table.left_table_type tr').forEach((tr) => {
        const th = tr.querySelector('th')?.textContent || '';

        if (/품명|모델명/.test(th)) {
          modelName = (tr.querySelector('td')?.textContent || '').replace(/\s+/g, ' ').trim();
        }
      });

      modelName = modelName.replace(/^\[[^\]]*\]\s*/, ''); // [니모] 제거
      // 색상은 모델명 "제품명 - 색상" 패턴에서만 추출(주로 텐트). 없으면 비전 단계에서 채움.
      let colorKorean = '';
      const dash = modelName.lastIndexOf(' - ');

      if (dash > 0) {
        colorKorean = modelName.slice(dash + 3).trim();
      }

      // 고시 이미지: 세로로 가장 긴 이미지(스킨 CDN 제외, 가로 300px+)
      let specImage = '';
      let maxH = 0;

      document.querySelectorAll('img').forEach((i) => {
        const src = i.src || i.getAttribute('data-src') || '';
        const w = i.naturalWidth;
        const h = i.naturalHeight;

        if (
          /^https?:/.test(src) &&
          !/nhncommerce/i.test(src) &&
          w > 300 &&
          h > w * 1.5 &&
          h > maxH
        ) {
          maxH = h;
          specImage = src;
        }
      });

      return { colorKorean, specImage };
    });
  } catch (e) {
    return empty;
  }
};

const buildPageUrl = (categoryUrl, pageNum) => {
  if (pageNum <= 1) {
    return categoryUrl;
  }

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
    console.log(`[nemo] navigation failed: ${categoryUrl} - ${e.message}`);
    await page.close();

    return [];
  }

  await new Promise((r) => setTimeout(r, 1200));

  const maxPage = await extractMaxPage(page);
  const rawItems = await extractListing(page);

  if (maxPage > 1) {
    console.log(`[nemo]   ${maxPage} pages for ${categoryUrl}`);

    for (let n = 2; n <= maxPage; n += 1) {
      try {
        await page.goto(buildPageUrl(categoryUrl, n), { waitUntil: 'networkidle2', timeout: 40000 });
        await new Promise((r) => setTimeout(r, 800));
        rawItems.push(...(await extractListing(page)));
      } catch (e) {
        console.log(`[nemo]   page ${n} failed: ${e.message}`);
      }
    }
  }

  // detailUrl 기준 중복 제거(페이지네이션/노출 중복)
  const seenUrl = new Set();
  const items = rawItems.filter((it) => {
    const key = it.detailUrl.replace(/.*goodsNo=/, '');

    if (seenUrl.has(key)) {
      return false;
    }

    seenUrl.add(key);

    return true;
  });

  if (items.length === 0) {
    await page.close();

    return [];
  }

  const category = guessCategory(categoryUrl);
  const results = [];
  let idx = 0;

  for (const it of items) {
    idx += 1;

    const { name: nameKorean, sizeKorean, colorKorean: listingColor } = splitName(it.name);
    let colorKorean = listingColor;
    let specImage = '';

    if (withWeight && it.detailUrl) {
      if (idx === 1 || idx % 5 === 0 || idx === items.length) {
        console.log(`[nemo]   detail ${idx}/${items.length}`);
      }

      const d = await fetchDetail(page, it.detailUrl);

      // 리스팅 이름에서 색상을 못 얻었으면 상세 모델명 색상 사용(단, 사이즈 토큰은 제외)
      if (!colorKorean && d.colorKorean && !SIZE_RE.test(d.colorKorean)) {
        colorKorean = d.colorKorean;
      }

      specImage = d.specImage;
    }

    results.push({
      groupId: `nemo_${slugFromName(nameKorean)}`,
      category,
      company: 'nemo',
      companyKorean: '니모',
      name: '',
      nameKorean,
      color: '',
      colorKorean,
      size: '',
      sizeKorean,
      weight: 0, // Phase B(비전)에서 채움
      imageUrl: it.imageUrl,
      specs: {}, // Phase B(비전)에서 채움
      _specImage: specImage,
      _source: categoryUrl,
    });
  }

  try {
    await page.close();
  } catch (_) {}

  return results;
};

export default {
  name: 'nemo',
  company: 'nemo',
  baseUrl: 'https://www.nemoequipment.co.kr',
  defaultCategories: [
    'https://www.nemoequipment.co.kr/goods/goods_list.php?cateCd=001002007', // Sleeping Pads - Ultralight (파일럿)
  ],
  crawl: async (browser, { categoryUrls, withWeight = true } = {}) => {
    const urls = categoryUrls?.length
      ? categoryUrls
      : ['https://www.nemoequipment.co.kr/goods/goods_list.php?cateCd=001002007'];
    const all = [];

    for (const url of urls) {
      console.log(`[nemo] crawling ${url}`);

      try {
        const items = await crawlCategory(browser, url, { withWeight });

        console.log(`[nemo] ${items.length} items from ${url}`);
        all.push(...items);
      } catch (e) {
        console.log(`[nemo] error on ${url}: ${e.message} — skipping`);
      }
    }

    // groupId 기준 최종 중복 제거(여러 서브카테고리 교차 노출)
    const seen = new Set();

    return all.filter((it) => {
      if (seen.has(it.groupId)) {
        return false;
      }

      seen.add(it.groupId);

      return true;
    });
  },
};

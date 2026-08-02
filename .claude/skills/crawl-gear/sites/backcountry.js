// 백컨트리(Backcountry, 국내 브랜드) — m.backcountry.co.kr, Cafe24 모바일 스킨.
// 리스팅: /product/list_thumb.html?cate_no=N, 서버렌더 + "더보기" 버튼이 AJAX로 다음
//   10개씩 이어붙인다($M.displayMore(...)) — 페이지네이션 URL 파라미터가 없어 puppeteer로
//   "더보기" 버튼을 more_total_page 횟수만큼 클릭해야 전체 목록이 로드된다.
// 상세: 표준 Cafe24 상품상세(select[name=option1]로 색상 옵션). 스펙(무게/사이즈/소재)이
//   텍스트가 아니라 상세 이미지(.ThumbImage, 특히 "product/extra/big/" 경로) 안에 인쇄되어
//   있어 크롤 단계에서는 이미지 URL만 모으고(_specImages), 무게는 별도
//   backcountry-weight-ocr.py(macOS Vision OCR)에서 채운다 — 크롤-기어 관례.
const BASE = 'https://m.backcountry.co.kr';
const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// ── 한글 로마자 표기(RR) — 국내 전용 브랜드라 영문명이 없어 name(영문)을 이걸로 채운다 ──
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
const romanizeName = (koreanText) =>
  koreanText
    .split(/(\s+)/)
    .map((t) => (/\s+/.test(t) ? t : romanizeToken(t)))
    .join('');

// 색상 select 옵션이 순수 색상이 아니라 "색상+번들타입"이 섞인 복합값이라("쉐이드
// 타프쉘(올리브그린) 단품" 등) color(영문)를 이 사전으로 우선 추출하고, 매칭 안 되는
// 단어는 로마자 음역으로 폴백한다.
const KO_COLOR_EN = {
  올리브그린: 'Olive Green', 차콜블랙: 'Charcoal Black', 웜그레이: 'Warm Gray',
  미들그레이: 'Middle Gray', 라이트그레이: 'Light Gray', 다크그레이: 'Dark Gray',
  블랙: 'Black', 화이트: 'White', 그레이: 'Gray', 그린: 'Green', 올리브: 'Olive',
  카키: 'Khaki', 베이지: 'Beige', 브라운: 'Brown', 네이비: 'Navy', 블루: 'Blue',
  레드: 'Red', 오렌지: 'Orange', 옐로우: 'Yellow', 옐로: 'Yellow', 차콜: 'Charcoal',
  웜: 'Warm', 다크: 'Dark', 라이트: 'Light', 실버: 'Silver', 골드: 'Gold',
  코요테: 'Coyote', 샌드: 'Sand', 우드랜드: 'Woodland', 퍼플: 'Purple', 핑크: 'Pink',
};
const translateColorWord = (koWord) => {
  if (KO_COLOR_EN[koWord]) return KO_COLOR_EN[koWord];
  // 사전에 없으면 긴 색상 키워드부터 부분매치 시도(복합어 대응), 실패하면 로마자 음역.
  const sorted = Object.keys(KO_COLOR_EN).sort((a, b) => b.length - a.length);
  const hit = sorted.find((k) => koWord.includes(k));
  if (hit) return KO_COLOR_EN[hit];
  return capitalizeFirstLetter(romanize(koWord));
};
// colorKorean(전체 옵션 텍스트, 번들타입 포함)에서 괄호 안 색상어만 뽑아 영문 변환.
// 괄호가 없으면 옵션 텍스트 전체를 색상어로 보고 변환.
const colorEnOf = (colorKorean) => {
  const m = colorKorean.match(/\(([^)]+)\)/);
  const target = m ? m[1] : colorKorean;
  return translateColorWord(target.replace(/\s+/g, ''));
};

const CATEGORY_MAP = {
  24: 'tent', // 텐트 & 쉘터
  26: 'sleeping_bag', // 침낭 & 침구류
  25: 'tarp', // 타프 & 타프 폴
  28: 'cookware_etc', // 쿠커 & 테이블
  44: 'stove', // 렌턴 & 스토브
  46: 'etc', // 보관 & 운행
  43: 'etc', // 악세사리 & 기타
};
const CATEGORY_KO = {
  24: '텐트 & 쉘터',
  26: '침낭 & 침구류',
  25: '타프 & 타프 폴',
  28: '쿠커 & 테이블',
  44: '렌턴 & 스토브',
  46: '보관 & 운행',
  43: '악세사리 & 기타',
};

// 카테고리 안에서도 품목이 섞여있어(예: 24엔 텐트뿐 아니라 쉘터·타프도, 28엔 쿠커·테이블·컵
// 다 섞임) 이름 키워드로 세부 분류한다. 위에서부터 먼저 매치되는 것 우선.
const classify = (cateNo, name) => {
  const n = name;
  if (/타프쉘|쉐이드\s*타프|타프\s*쉘/.test(n)) return 'shelter';
  if (/타프/.test(n)) return 'tarp';
  if (/쉘터/.test(n)) return 'tent'; // 백컨트리 "쉘터"류는 자립형 소형 텐트에 가까움
  if (/침낭|슬리핑\s*백/.test(n)) return 'sleeping_bag';
  if (/매트|에어매트|폼매트/.test(n)) return 'mat';
  if (/베개|필로우/.test(n)) return 'pillow';
  if (/테이블/.test(n)) return 'table';
  if (/체어|의자/.test(n)) return 'chair';
  if (/머그|컵\b/.test(n)) return 'cup';
  if (/보울|그릇/.test(n)) return 'bowl';
  if (/수저|스푼|포크|젓가락|커트러리/.test(n)) return 'cutlery';
  if (/물통|보틀/.test(n)) return 'bottle';
  if (/랜턴|랜턴|조명|라이트\b/.test(n)) return 'lighting';
  if (/스토브|버너|화목난로/.test(n)) return 'stove';
  if (/토치/.test(n)) return 'torch';
  if (/타프폴|폴대|텐트폴|서브폴/.test(n)) return 'tent_acc';
  if (/가방|파우치|백팩|배낭/.test(n)) return 'backpack';
  return CATEGORY_MAP[cateNo] ?? 'etc';
};

const UA_HEADERS = { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' };

const slugify = (s) =>
  s.trim().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}()-]/gu, '').toLowerCase();

const dismissPopup = async (page) => {
  await page
    .evaluate(() => {
      const btn = [...document.querySelectorAll('a,button')].find((b) => /close|닫기/i.test(b.textContent || '') || /close/i.test(b.className || ''));
      if (btn) btn.click();
    })
    .catch(() => {});
};

// "더보기" 버튼을 more_total_page 만큼 클릭해 카테고리 전체 상품을 로드.
const loadAllProducts = async (page) => {
  const totalPage = await page.evaluate(() => {
    const el = document.getElementById('more_total_page');
    return el ? parseInt(el.textContent, 10) : 1;
  });
  for (let i = 1; i < totalPage; i++) {
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('a')].find((a) => a.textContent.includes('더보기'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 700));
  }
  return page.evaluate(() => {
    const seen = new Set();
    const out = [];
    document.querySelectorAll('a[href*="product_no"]').forEach((a) => {
      const url = new URL(a.href);
      const no = url.searchParams.get('product_no');
      const name = a.textContent.trim();
      if (!no || !name || seen.has(no)) return;
      seen.add(no);
      const img = a.querySelector('img') || a.closest('li')?.querySelector('img');
      out.push({
        productNo: no,
        nameKorean: name,
        detailUrl: `${location.origin}/product/detail.html?product_no=${no}`,
        imageUrl: img ? img.src.split('?')[0] : '',
      });
    });
    return out;
  });
};

const fetchCategoryListing = async (page, cateNo) => {
  await page.goto(`${BASE}/product/list_thumb.html?cate_no=${cateNo}`, { waitUntil: 'networkidle2', timeout: 60000 });
  await dismissPopup(page);
  await new Promise((r) => setTimeout(r, 500));
  return loadAllProducts(page);
};

const fetchDetail = async (page, item) => {
  await page.goto(item.detailUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  // dismissPopup(상단 배너 닫기 클릭)을 여기서 부르면 그 클릭이 유발하는 레이아웃 변화 때문에
  // 상세설명(NNEditor) lazy-load 스크립트의 리스너 등록이 깨진다(실측 확인) — headless로 DOM만
  // 읽는 우리는 팝업이 보여도 무해하므로 상세페이지에서는 아예 호출하지 않는다.
  // 카테고리 리스팅(더보기 반복 클릭으로 썸네일 수십 개 로드)을 거친 직후 상세페이지로 넘어오면
  // networkidle2 가 찍힌 뒤에도 상세설명의 lazy-load 스크립트가 아직 리스너를 안 붙인 상태라
  // 바로 스크롤해도 안 걸린다(실측: 400ms 로는 거의 항상 실패, 2000ms 는 안정적으로 성공).
  await new Promise((r) => setTimeout(r, 2000));
  const basic = await page.evaluate(() => {
    const select = document.querySelector('select[name="option1"]');
    const colors = select
      ? [...select.options].filter((o) => o.value && o.value !== '*' && o.value !== '**' && !/^-+$/.test(o.text.trim())).map((o) => o.text.trim())
      : [];
    const priceEl = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /^\d[\d,]*원$/.test(e.textContent.trim()));
    const imgs = [...document.querySelectorAll('img.ThumbImage')].map((i) => i.src.split('?')[0]).filter((s) => /\/web\/product\//.test(s));
    const mainImage = imgs[0] || '';
    const specImages = imgs.slice(1);
    return { colors, mainImage, specImages, priceText: priceEl ? priceEl.textContent.trim() : '' };
  });
  // 상세설명(NNEditor) 이미지는 lazy-load라 스크롤해야 실제 src가 채워진다. 스펙표(무게 등)가
  // 상품 갤러리(.ThumbImage)가 아니라 여기(상세설명 영역)에만 있는 경우가 많다 — 이 세션에서
  // 스크린샷으로 확인된 실제 원인. 고정 sleep 은 크롤 루프처럼 같은 page 를 계속 재사용하며
  // 연속 navigate 할 때 lazy-load 완료 전에 읽어버려 항상 placeholder 1장만 잡히는 문제가
  // 있었다 — waitForFunction 으로 실제 로드 완료(2장 이상)를 능동 대기.
  await page.evaluate(async () => {
    const total = document.body.scrollHeight;
    for (let y = 0; y < total; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 100));
    }
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page
    .waitForFunction(
      () => [...document.querySelectorAll('img')].filter((i) => /\/web\/upload\/NNEditor\//.test(i.src)).length > 1,
      { timeout: 5000 }
    )
    .catch(() => {});
  await new Promise((r) => setTimeout(r, 300));
  const descImages = await page.evaluate(() =>
    [...document.querySelectorAll('img')].map((i) => i.src.split('?')[0]).filter((s) => /\/web\/upload\/NNEditor\//.test(s))
  );
  return { ...basic, specImages: [...basic.specImages, ...descImages] };
};

const buildRows = (item, category, detail) => {
  const colors = detail.colors.length ? detail.colors : [''];
  const nameEnglish = romanizeName(item.nameKorean);
  return colors.map((colorKorean) => ({
    groupId: `backcountry_${slugify(item.nameKorean)}`,
    category,
    company: 'backcountry',
    companyKorean: '백컨트리',
    name: colorKorean ? `${nameEnglish} / ${colorEnOf(colorKorean)}` : nameEnglish,
    nameKorean: colorKorean ? `${item.nameKorean} ${colorKorean}` : item.nameKorean,
    color: colorKorean ? colorEnOf(colorKorean) : '',
    colorKorean,
    size: '',
    sizeKorean: '',
    weight: 0, // OCR 스크립트(backcountry-weight-ocr.py)에서 채움
    imageUrl: detail.mainImage || item.imageUrl,
    specs: {},
    _source: `${BASE}/product/list_thumb.html?cate_no=${item._cateNo}`,
    _detailUrl: item.detailUrl,
    _productNo: item.productNo,
    _specImages: detail.specImages,
  }));
};

export default {
  name: 'backcountry',
  company: 'backcountry',
  companyKorean: '백컨트리',
  baseUrl: BASE,
  defaultCategories: Object.keys(CATEGORY_MAP),
  crawl: async (browser, { categoryUrls, withWeight = true } = {}) => {
    const cateNos = categoryUrls?.length ? categoryUrls : Object.keys(CATEGORY_MAP);
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    await page.setViewport({ width: 480, height: 900 });

    const all = [];
    for (const cateNo of cateNos) {
      console.log(`[backcountry] crawling cate_no=${cateNo} (${CATEGORY_KO[cateNo] ?? ''})`);
      const items = await fetchCategoryListing(page, cateNo);
      console.log(`[backcountry]   ${items.length} listing items`);
      let i = 0;
      for (const item of items) {
        i += 1;
        item._cateNo = cateNo;
        try {
          const detail = withWeight
            ? await fetchDetail(page, item)
            : { colors: [], mainImage: '', specImages: [], priceText: '' };
          const category = classify(cateNo, item.nameKorean);
          all.push(...buildRows(item, category, detail));
        } catch (e) {
          console.log(`[backcountry]   error on ${item.productNo}: ${e.message} — skipping`);
        }
        if (i % 10 === 0) console.log(`[backcountry]   detail ${i}/${items.length}`);
      }
    }
    await page.close();
    return all;
  },
};

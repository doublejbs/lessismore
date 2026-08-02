// 블랙다이아몬드(Black Diamond) — blackdiamondequipment.co.kr, 고도몰(Godo) 기반.
// 리스팅/상세 전부 CSR(JS 렌더) — curl로는 상품 데이터가 안 나온다(빈 셸만 서버렌더).
// puppeteer 필수. 리스팅: /goods/catalog?page=N&searchMode=catalog&category=c<12자리코드>
//   &sorting=ranking&auto=1, 카드 li.goods_list_style1, 링크 a[href*="/goods/view?no="].
//   페이지네이션 마크업이 없고 그냥 page=N을 계속 늘리면 마지막 페이지 다음부터 카드 0개.
// 상세: /goods/view?no=<N>. 색상 옵션은 .bdia_color_option li > img[alt=색상명]에
//   onclick="gcsImgView('/data/goods/....jpg', '..._thumb.jpg')"로 그 색상 전용 이미지가
//   라벨과 함께 있어(AMG 케이스와 달리 순서 추측 불필요) img.alt로 바로 매칭 가능.
//   사이즈는 select[name="viewOptions[]"] 중 두 번째(색상 다음) — 옵션 축 순서 고정.
// 무게/소재는 두 가지 템플릿이 섞여 있다:
//   (a) 해외 오리지널 컨텐츠(의류 등): "TECH SPECS ... MATERIALS <설명> WEIGHT <N> g"
//   (b) 국내 자체 제작(하드웨어 일부): "PRODUCT FEATURES ... 무게: <N> g"
//   상품정보제공고시 표는 "상세설명참조"(플레이스홀더)뿐이라 못 씀 — 위 두 텍스트 패턴에서 파싱.
const BASE = 'https://blackdiamondequipment.co.kr';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// 카테고리 코드(12자리) → 내부 카테고리 키. NEW/BEST/전체보기 같은 배너성 재노출 카테고리와
// SPORTS(0001)/COLLECTION(0007)/OUTLET(0006) 최상위 그룹은 EQUIPMENT/MEN'S/WOMEN'S 하위
// 카테고리와 상품이 겹치는 재분류 뷰라서 크롤 대상에서 제외한다(중복 크롤 방지).
const CATEGORY_MAP = {
  // MEN'S (0003)
  '000300070003': 'clothing', // 쉘
  '000300070005': 'clothing', // 인슐레이션/다운
  '000300070001': 'clothing', // 스키 재킷
  '000300070006': 'clothing', // 플리스
  '000300080002': 'clothing', // 티셔츠/민소매
  '000300080001': 'clothing', // 셔츠
  '000300080003': 'clothing', // 후디
  '000300080004': 'clothing', // 베이스 레이어
  '000300090001': 'clothing', // 팬츠
  '000300090003': 'clothing', // 쇼츠
  '000300090005': 'clothing', // 스키 팬츠
  '000300090004': 'clothing', // 베이스 레이어(하의)
  '000300100001': 'etc', // 캡
  '000300100002': 'etc', // 비니
  '000300100003': 'etc', // 벨트
  '000300100004': 'etc', // 헤드밴드/바라클라바
  // WOMEN'S (0004)
  '000400070003': 'clothing',
  '000400070005': 'clothing',
  '000400070001': 'clothing',
  '000400070006': 'clothing',
  '000400080005': 'clothing',
  '000400080001': 'clothing',
  '000400080003': 'clothing',
  '000400080004': 'clothing',
  '000400090001': 'clothing',
  '000400090003': 'clothing',
  '000400090006': 'clothing',
  '000400090004': 'clothing',
  '000400100001': 'etc',
  '000400100002': 'etc',
  '000400100003': 'etc',
  '000400100004': 'etc',
  // EQUIPMENT (0002) — 클라이밍 하드웨어
  '000200010002': 'etc', // 하네스
  '000200010003': 'etc', // 헬멧
  '000200010004': 'etc', // 프로텍션
  '000200010005': 'etc', // 카라비너
  '000200010006': 'etc', // 퀵드로우/런너
  '000200010007': 'etc', // 아이스/알파인
  '000200010008': 'etc', // 로프/빌레이
  '000200010011': 'etc', // 빅 월
  '000200010014': 'etc', // 쵸크/쵸크백/ACC
  '000200010015': 'etc', // 크래쉬 패드
  '000200010012': 'etc', // 클라이밍 슈즈
  '000200010010': 'gloves', // 클라이밍 글러브
  '000200010013': 'backpack', // 클라이밍 배낭
  // EQUIPMENT — 배낭/폴/조명/텐트
  '000200040008': 'backpack', // 등산/러닝 배낭
  '000200040009': 'backpack', // 트래블 배낭
  '000200040001': 'trekking_pole', // 등산/러닝 폴
  '000200040004': 'etc', // 스페어 파츠/ACC
  '000200040010': 'lighting', // 헤드램프/랜턴
  '000200040011': 'tent', // 텐트/비비 (비비는 fetchDetail에서 이름보고 shelter로 보정)
  // EQUIPMENT — 스키
  '000200020002': 'etc', // 스키
  '000200020005': 'etc', // 스키 폴
  '000200020006': 'gloves', // 스키 글러브
  '000200020008': 'backpack', // 스키 배낭
  '000200020003': 'etc', // 스키 바인딩
  '000200020004': 'etc', // 클라이밍 스킨
  '000200020009': 'etc', // 스페어 파츠/ACC
  '000200020007': 'etc', // 눈사태 안전장비
  // EQUIPMENT — 풋웨어
  '000200140001': 'etc', // 클라이밍 슈즈
  '000200140002': 'etc', // 어프로치 슈즈
  '000200140003': 'etc', // 라이프스타일 슈즈
  '000200140004': 'gaiter', // 게이터
  // EQUIPMENT — 글러브
  '000200090002': 'gloves', // 에브리데이 글러브
  '000200090001': 'gloves', // 하이킹/러닝 글러브
  '000200090003': 'gloves', // 클라이밍 글러브
  '000200090004': 'gloves', // 스키&스노우보드 글러브
};

const catOf = (code, nameKorean) => {
  const base = CATEGORY_MAP[code] ?? 'etc';
  if (base === 'tent' && /비비|bivy/i.test(nameKorean)) return 'shelter';
  return base;
};

// 괄호 안 내용을 지우지 않는다 — "퍼스트라이트 3P 그라운드 클로쓰"와 "...클로쓰(K)"처럼
// 괄호가 서로 다른 상품을 구분하는 유일한 표시인 경우가 있어(AMG 세션에서 확인한 동일 함정),
// 지우면 다른 상품이 같은 groupId로 충돌한다.
const slugify = (s) =>
  s
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}()-]/gu, '')
    .toLowerCase();

// name(영문) 필드용 로마자 음역 — 국제 브랜드라도 모델명이 한글 표기로만 나오는 경우가 많다
// (예: "스트라타라인 스트레치 쉘" = Strataline Stretch Shell 음역). 이미 영문/숫자인 부분
// (MENS, C4 등)은 그대로 두고 한글 토큰만 음역한다(제로그램/AMG 어댑터와 동일 구현).
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

const toGrams = (val, unit) => (unit.toLowerCase() === 'kg' ? Math.round(val * 1000) : val);

// 라벨 없이 단일 값인 경우: "WEIGHT 155 g" / "무게: 70 g" / "평균 중량 3.2 kg"(텐트) /
// "개당 무게 154g"(트레킹폴, 브래킷 표 없을 때). "중량"/"무게" 둘 다 쓰이므로 둘 다 검사.
// "WEIGHT 720g(unisex) / 668g(womens)" 처럼 성별로 값이 갈리는 경우(오타 "WHIGHT"도 실제
// 사이트에 있어 같이 검사) — isWomens가 주어지면 해당 값을, 아니면 첫 값을 쓴다.
const parseWeightSingle = (text, isWomens = false) => {
  const genderSplit = text.match(/(\d+(?:\.\d+)?)\s*(g|kg)\s*\(unisex\)\s*\/\s*(\d+(?:\.\d+)?)\s*(g|kg)\s*\(womens\)/i);
  if (genderSplit) {
    return isWomens ? toGrams(parseFloat(genderSplit[3]), genderSplit[4]) : toGrams(parseFloat(genderSplit[1]), genderSplit[2]);
  }
  let m = text.match(/W[EH]IGHT(?:\s*PER\s*(?:PAIR|UNIT))?\s*[:：]?\s*(\d+(?:\.\d+)?)\s*(g|kg)\b/i);
  if (!m) m = text.match(/(?:평균\s*중량|개당\s*무게|무\s*게|중\s*량)\s*[:：]?\s*(\d+(?:\.\d+)?)\s*(g|kg)\b/);
  return m ? toGrams(parseFloat(m[1]), m[2]) : 0;
};

// 사이즈별 무게 표: "WEIGHT [S] 43 g [M] 48 g" (배낭/게이터), "개당 무게 [95-110 cm] 154 g
// [110-125 cm] 168 g"(트레킹폴 길이별) — 대괄호 라벨 뒤에 숫자+단위가 오는 쌍을 전부 뽑는다.
const parseWeightTable = (text) => {
  const pairs = [];
  const re = /\[([^\]]+)\]\s*(\d+(?:\.\d+)?)\s*(g|kg)\b/gi;
  let m;
  while ((m = re.exec(text))) {
    pairs.push({ label: m[1].trim(), weightG: toGrams(parseFloat(m[2]), m[3]) });
  }
  return pairs;
};

// 라벨/사이즈 표기가 사이트 안에서도 제각각이다 — 게이터는 "[S]"↔사이즈select "S"로 정확히
// 같지만, 배낭은 "[S/M]"↔"S_M"(슬래시가 언더스코어로), 트레킹폴은 "[95-110 cm]"↔"110"
// (범위의 끝 숫자만)처럼 다르다. 정규화 후 정확매치, 안 되면 범위 끝값 매치로 폴백한다.
const normalizeSizeKey = (s) =>
  s.toLowerCase().replace(/\s*cm\s*$/i, '').replace(/[\s/_]+/g, '').trim();
const matchWeightForSize = (pairs, size) => {
  if (!pairs.length) return null;
  const key = normalizeSizeKey(size);
  const exact = pairs.find((p) => normalizeSizeKey(p.label) === key);
  if (exact) return exact.weightG;
  // "95-110" 같은 범위 라벨의 끝 숫자가 사이즈 select 값과 같은 경우(트레킹폴 길이).
  const byRangeEnd = pairs.find((p) => {
    const m = p.label.match(/(\d+)\s*(?:cm)?\s*$/i);
    return m && m[1] === String(size).replace(/\D/g, '');
  });
  if (byRangeEnd) return byRangeEnd.weightG;
  // 사이즈 select가 "SML"/"MED"/"LRG"처럼 단어 축약형인데 무게표 라벨은 "[S]"/"[M]"/"[L]"
  // 한 글자뿐인 경우(디스턴스 배낭류) — 첫 글자로 대응.
  const firstLetter = key[0];
  const byInitial = pairs.find((p) => normalizeSizeKey(p.label) === firstLetter);
  return byInitial ? byInitial.weightG : null;
};

// "상품 정보 제공 고시" 표는 값 없이 "상세설명참조"뿐이고, 그 안의 "재질" 라벨이 뒤에 오는
// 무관한 텍스트(제조자/원산지 등)까지 통째로 삼킬 수 있어 — TECH SPECS 구간(고시 표 이전)
// 으로만 검색을 한정한다. 하드웨어류는 "소재", 의류류는 "MATERIALS" 라벨을 쓴다.
const parseMaterial = (text) => {
  const cutIdx = text.indexOf('상품 정보 제공 고시');
  const scoped = cutIdx === -1 ? text : text.slice(0, cutIdx);
  let m = scoped.match(/MATERIALS?\s+([^\n]+?)(?=\s*(?:WEIGHT|$))/i);
  if (m) return m[1].trim().slice(0, 100);
  m = scoped.match(/소재\s+([^\n]+?)(?=\s*(?:게이트|무게|WEIGHT|최저|강도|색상|사이즈|크기|$))/);
  if (m) return m[1].trim().slice(0, 100);
  m = scoped.match(/재\s*질\s*[:：]?\s*([^\n,]+)/);
  return m ? m[1].trim().slice(0, 100) : '';
};

const fetchListingPage = async (page, code, pageNo) => {
  const url = `${BASE}/goods/catalog?page=${pageNo}&searchMode=catalog&category=c${code}&sorting=ranking&auto=1`;
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('li.goods_list_style1', { timeout: 8000 }).catch(() => {});
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('li.goods_list_style1')];
    return cards
      .map((li) => {
        const a = li.querySelector('a[href*="/goods/view?no="]');
        if (!a) return null;
        const m = a.href.match(/no=(\d+)/);
        if (!m) return null;
        const nameEl = li.querySelector('.goods_name_area .name, .goods_name_area');
        return { no: m[1], nameKorean: nameEl ? nameEl.textContent.trim() : '' };
      })
      .filter(Boolean);
  });
};

// 대량 크롤 중 간헐적으로 "503 - Server Unavailable" 같은 에러 페이지가 오는데, puppeteer의
// page.goto는 HTTP 에러여도 reject하지 않아 그대로 상품명("503 - Server Unavailable")으로
// 저장돼버린다 — 최대 2회 재시도.
const isErrorPage = (nameKorean) => /^\d{3}\s*-|server (is )?unavailable|service unavailable/i.test(nameKorean);

const fetchDetail = async (page, no) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await fetchDetailOnce(page, no);
    if (!isErrorPage(result.nameKorean)) return result;
    console.log(`[black-diamond]   ${no}: 에러 페이지 감지, 재시도 ${attempt + 1}/3`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  return fetchDetailOnce(page, no);
};

const fetchDetailOnce = async (page, no) => {
  await page.goto(`${BASE}/goods/view?no=${no}`, { waitUntil: 'networkidle2', timeout: 60000 });
  // .goods_description_images 는 초기 렌더에도 빈 채로 존재해 waitForSelector만으로는
  // 콘텐츠가 실제로 채워지길 기다리지 못한다(레이스 컨디션으로 무게/소재가 간헐적으로 0/빈값이
  // 되는 원인이었음) — 텍스트가 실제로 채워질 때까지 기다린다.
  await page
    .waitForFunction(
      () => {
        const el = document.querySelector('.goods_description_images.goods_view_contents');
        // 사이즈 select도 설명 텍스트와 별도 타이밍으로 채워질 수 있다(실제 겪음 — 설명은
        // 채워졌는데 사이즈 옵션이 플레이스홀더 1개뿐인 채로 읽혀 사이즈가 통째로 빈값이 됨).
        // 옵션 select가 있는 상품이면 그것도 populate될 때까지 같이 기다린다.
        const descOk = el && el.textContent.trim().length > 50;
        const selects = document.querySelectorAll('select[name="viewOptions[]"]');
        const selectsOk = selects.length === 0 || [...selects].every((s) => s.options.length > 1);
        return descOk && selectsOk;
      },
      { timeout: 10000 }
    )
    .catch(() => {});
  await new Promise((r) => setTimeout(r, 300));
  return page.evaluate(() => {
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    const nameKorean = ogTitle ? ogTitle.content.trim() : (document.title || '').replace(/\s*-\s*블랙다이아몬드\s*$/, '').trim();
    const imageUrl = ogImage ? ogImage.content.split('?')[0] : '';

    const colorBox = document.querySelector('.bdia_color_option');
    const colors = colorBox
      ? [...colorBox.querySelectorAll('li')]
          .map((li) => {
            const img = li.querySelector('img');
            const onclick = li.getAttribute('onclick') || '';
            const m = onclick.match(/gcsImgView\('([^']+)'/);
            // "One"/"ONE"은 실제 색상이 아니라 색상 옵션 자체가 없을 때 고도몰이 붙이는
            // 기본 라벨(사이즈의 "ONE"과 같은 성격) — 색상 없음으로 처리.
            const raw = img ? img.alt.trim() : '';
            // gcsImgView 인자는 도메인 없는 절대경로("/data/goods/...")라 origin을 붙인다.
            let colorImg = m ? m[1].split('?')[0] : '';
            if (colorImg.startsWith('/')) colorImg = location.origin + colorImg;
            return {
              colorEnglish: /^one$/i.test(raw) ? '' : raw,
              imageUrl: colorImg,
            };
          })
          .filter((c) => c.colorEnglish)
      : [];

    const selects = [...document.querySelectorAll('select[name="viewOptions[]"]')];
    const sizeSelect = selects[1];
    const sizes = sizeSelect
      ? [...sizeSelect.options]
          .slice(1)
          // "XL (품절)"처럼 품절 표시가 라벨에 붙어있어도 사이즈 자체는 그대로 담는다(과거
          // 소유 기록 등을 위해 품절 여부와 무관하게 완전 수집) — 표시 문구만 제거.
          .map((o) => o.textContent.replace(/\s*\(?품절\)?\s*/g, '').trim())
          .filter((t) => t && t !== 'ONE')
      : [];

    const descEl = document.querySelector('.goods_description_images.goods_view_contents');
    const descText = descEl ? descEl.textContent.replace(/\s+/g, ' ').trim() : '';

    return { nameKorean, imageUrl, colors, sizes, descText };
  });
};

// 브랜드 자체가 국제 브랜드라 색상명이 이미 영문(Basalt, Creek Blue 등) — 별도 번역 사전
// 불필요. colorKorean은 음역(로마자 역방향 아님, 발음 그대로 한글 표기)으로 채운다.
const EN_TO_KO_SOUND = {
  a: '아', b: '브', c: '크', d: '드', e: '이', f: '프', g: '그', h: '흐', i: '이', j: '지',
  k: '크', l: '을', m: '므', n: '느', o: '오', p: '프', q: '크', r: '르', s: '스', t: '트',
  u: '우', v: '브', w: '우', x: '스', y: '이', z: '즈',
};
const KNOWN_COLOR_KO = {
  black: '블랙', white: '화이트', gray: '그레이', grey: '그레이', navy: '네이비', blue: '블루',
  green: '그린', red: '레드', orange: '오렌지', yellow: '옐로우', pink: '핑크', purple: '퍼플',
  brown: '브라운', beige: '베이지', olive: '올리브', khaki: '카키', silver: '실버', gold: '골드',
  // 순수 색상명이 아니라 마감/소재/수식어 느낌의 옵션명도 섞여 있어(카라비너 Polished,
  // "Light Gray"의 Light 등) 별도 등재. 크롤 중 새로 보이는 단어는 여기 추가.
  polished: '폴리시드', natural: '내추럴', raw: '로우', anodized: '아노다이즈드',
  vibrant: '바이브런트', graphite: '그래파이트', titanium: '티타늄', anthracite: '안트라사이트',
  octane: '옥테인', minted: '민티드', envy: '엔비', ultra: '울트라', light: '라이트', dark: '다크',
  astral: '아스트랄', slate: '슬레이트', fire: '파이어', storm: '스톰', steel: '스틸',
  rose: '로즈', coral: '코랄', sulphur: '설퍼', wild: '와일드', rain: '레인', ash: '애쉬',
};
// 사전에 없는 단어는 자음+모음을 묶어 음절 단위로 근사 표기한다(한 글자씩 이어붙이면
// "Polished"→"프오을이스흐이드"처럼 심하게 깨짐). 완벽한 영한 표기법은 아니고 최후 폴백.
const VOWELS = new Set('aeiouy');
const syllabicKorean = (word) => {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return '';
  const chunks = [];
  let cur = '';
  for (const ch of w) {
    cur += ch;
    if (VOWELS.has(ch)) {
      chunks.push(cur);
      cur = '';
    }
  }
  if (cur) chunks.length ? (chunks[chunks.length - 1] += cur) : chunks.push(cur);
  return chunks.map((c) => [...c].map((ch) => EN_TO_KO_SOUND[ch] ?? '').join('')).join('');
};
const roughColorKorean = (colorEnglish) =>
  colorEnglish
    .split(/\s+/)
    .map((w) => KNOWN_COLOR_KO[w.toLowerCase()] ?? syllabicKorean(w))
    .join(' ');

// specs-schema.js 기준 카테고리별 "material"(범용 소재) 키가 실제로 존재하는 카테고리만.
// lighting은 소재 필드 자체가 없고, tent/shelter는 innerMaterial/flyMaterial/poleMaterial로
// 나뉘어 있어 범용 material을 쓰면 스키마 위반이 된다 — 이 카테고리들은 specs를 비워둔다.
const MATERIAL_CATEGORIES = new Set(['clothing', 'etc', 'gloves', 'backpack', 'trekking_pole', 'gaiter']);

const buildRows = (item, category, detail) => {
  const nameKorean = detail.nameKorean || item.nameKorean;
  const material = MATERIAL_CATEGORIES.has(category) ? parseMaterial(detail.descText) : '';
  const specs = material ? { material } : {};

  // 무게가 사이즈별 표(배낭/게이터/트레킹폴)인 경우 행마다(사이즈마다) 다른 값을 써야 한다
  // — 컬럼 인덱스가 아니라 사이즈 라벨로 매핑(AMG 세션 "변형 처리" 원칙과 동일).
  const weightPairs = parseWeightTable(detail.descText);
  const singleWeight = parseWeightSingle(detail.descText, /women/i.test(nameKorean));
  const weightForSize = (size) => {
    // 대괄호 표에 값이 딱 하나뿐이면(예: "WEIGHT [M] 400 g"인데 실제 사이즈는 SML/MED/LRG라
    // 라벨과 안 맞을 수 있음) 사이즈 구분 없이 그 상품 전체의 대표 무게로 본다 — 사이즈별로
    // 실측한 게 아니라 참고용 단일 값을 넣어둔 것으로 판단.
    if (weightPairs.length === 1) return weightPairs[0].weightG;
    if (size) {
      const matched = matchWeightForSize(weightPairs, size);
      if (matched !== null) return matched;
    }
    if (singleWeight) return singleWeight;
    // 사이즈별 무게표는 있는데(2개 이상) 그 상품엔 사이즈 select 자체가 없는 경우(실제 겪음,
    // 트레킹폴 일부) — 어느 사이즈인지 알 수 없어 정확하진 않지만 첫 값을 대표값으로 쓴다.
    // 0으로 비워두는 것보다 근사치가 낫다고 판단(사용자 요청 — 배낭/텐트는 무게가 꼭 있어야 함).
    return weightPairs.length ? weightPairs[0].weightG : 0;
  };

  const common = {
    groupId: `black-diamond_${slugify(nameKorean)}`,
    category,
    company: 'black-diamond',
    companyKorean: '블랙다이아몬드',
    // 국제 브랜드지만 모델명이 한글 표기로만 나오는 경우가 많아(예: "스트라타라인 스트레치
    // 쉘") 한글 토큰만 로마자 음역하고 이미 영문/숫자인 부분(MENS, C4 등)은 그대로 둔다.
    name: romanizeName(nameKorean),
    nameKorean,
    imageUrl: detail.imageUrl,
    specs,
    _source: `${BASE}/goods/catalog?category=c${item._code}#${category}`,
    _detailUrl: `${BASE}/goods/view?no=${item.no}`,
    _productNo: item.no,
  };

  if (!detail.colors.length) {
    const sizes = detail.sizes;
    if (!sizes.length) {
      return [{ ...common, color: '', colorKorean: '', size: '', sizeKorean: '', weight: singleWeight }];
    }
    return sizes.map((size) => ({ ...common, color: '', colorKorean: '', size, sizeKorean: size, weight: weightForSize(size) }));
  }

  const sizes = detail.sizes.length ? detail.sizes : [''];
  return detail.colors.flatMap((c) =>
    sizes.map((size) => ({
      ...common,
      color: c.colorEnglish,
      colorKorean: roughColorKorean(c.colorEnglish),
      size,
      sizeKorean: size,
      weight: weightForSize(size),
      imageUrl: c.imageUrl || detail.imageUrl,
    }))
  );
};

const crawlCategory = async (browser, code) => {
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setViewport({ width: 1280, height: 1000 });
  const seenNo = new Map();
  try {
    for (let p = 1; p <= 30; p += 1) {
      const items = await fetchListingPage(page, code, p);
      if (items.length === 0) break;
      for (const it of items) if (!seenNo.has(it.no)) seenNo.set(it.no, it);
      console.log(`[black-diamond]   ${code} page ${p}: +${items.length} (total ${seenNo.size})`);
    }
  } catch (e) {
    console.log(`[black-diamond] listing error ${code}: ${e.message}`);
  }
  await page.close();
  return seenNo;
};

export default {
  name: 'black-diamond',
  company: 'black-diamond',
  companyKorean: '블랙다이아몬드',
  baseUrl: BASE,
  defaultCategories: Object.keys(CATEGORY_MAP),
  crawl: async (browser, { categoryUrls, withWeight = true } = {}) => {
    const codes = categoryUrls?.length ? categoryUrls : Object.keys(CATEGORY_MAP);
    const globalSeen = new Set();
    const all = [];
    const detailPage = await browser.newPage();
    await detailPage.setUserAgent(UA);
    await detailPage.setViewport({ width: 1280, height: 1000 });

    for (const code of codes) {
      console.log(`[black-diamond] crawling ${code} (${CATEGORY_MAP[code] ?? 'etc'})`);
      const items = await crawlCategory(browser, code);
      let i = 0;
      for (const [no, item] of items) {
        i += 1;
        if (globalSeen.has(no)) continue;
        globalSeen.add(no);
        item._code = code;
        const category = catOf(code, item.nameKorean);
        if (withWeight) {
          try {
            const detail = await fetchDetail(detailPage, no);
            all.push(...buildRows(item, category, detail));
          } catch (e) {
            console.log(`[black-diamond]   detail error ${no}: ${e.message}`);
          }
        } else {
          all.push(...buildRows(item, category, { nameKorean: item.nameKorean, imageUrl: '', colors: [], sizes: [], descText: '' }));
        }
        if (i % 10 === 0) console.log(`[black-diamond]   ${code} detail ${i}/${items.size}`);
      }
    }
    await detailPage.close();
    return resolveGroupIdCollisions(all);
  },
};

// 서로 다른 productNo(다른 물리 상품)가 이름이 완전히 같아 groupId+color+size 가 충돌하는
// 경우가 실제로 있다(예: "캐머롯 C4 #4"와 "캐머롯  C4 .4" 표기가 달라도 슬러그화하면 같아짐,
// "트랜스퍼 쇼블"이라는 이름의 서로 다른 두 SKU가 색상 하나를 공유). push.js 업서트 매치가
// groupId+color+size라 그대로 두면 하나가 다른 하나를 덮어쓴다 — 충돌하는 조합만 productNo를
// 접미사로 붙여 구분한다(대부분의 정상 케이스는 이름 그대로 유지).
const resolveGroupIdCollisions = (rows) => {
  const counts = {};
  for (const r of rows) {
    const key = `${r.groupId}|${r.color}|${r.size}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return rows.map((r) => {
    const key = `${r.groupId}|${r.color}|${r.size}`;
    if (counts[key] <= 1) return r;
    return { ...r, groupId: `${r.groupId}-${r._productNo}` };
  });
};

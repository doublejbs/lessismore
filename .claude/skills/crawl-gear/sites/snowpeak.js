// 스노우피크 코리아(snowpeak.co.kr) — Next.js SPA인데 깔끔한 REST JSON API가 뒤에 있어
// puppeteer 불필요, 순수 fetch만으로 전부 크롤 가능. (사이트 UI는 상품 링크가 href="#" +
// React onClick 라우팅이라 DOM 파싱으론 상세 URL을 못 얻는다 — 반드시 아래 API를 쓴다.)
//
// API (전부 쿠키/인증 없이 curl로 접근 가능):
//   리스팅: /restapi/god/goods/{cateCd}/list?sortFlag=REG&soldOutExcYn=N&size=100&page=N
//           → { items:[{godCd, godNm, lineNm, imgUrl, salePr, tagPr, colorList[]}], totalPages }
//   상세:   /restapi/god/goods/{godCd}
//           → { godCd, godNm(한글), godEngNm(영문!), lineNm, imgUrls[], optList[], godSize(스펙HTML) }
//   ⚠ cateCd는 쿼리가 아니라 "경로 세그먼트"다(/goods/0106/list). /goods/list?cateCd= 는 401.
//
// ⚠ 스펙(무게/재질/사이즈/방수등급/밝기/용량...)이 상세의 godSize HTML "<table><caption>Spec"에
//    텍스트로 들어있다 — OCR 불필요. 무게 라벨은 "중량" 또는 "무게" 둘 다 쓰이고, 값 포맷이
//    다양하다: "17.2kg", "약 25.5kg", "3.4kg (1개당)", "5g(전지 제외)", "본체 / 1.9kg",
//    "1개당 0.8kg". → 값에서 첫 (숫자+kg|g)만 뽑아 g로 환산.
//
// ⚠ 변형 두 메커니즘:
//   1. 같은 godCd 안의 optList(색상)×itemList(사이즈/optVal) — 실측: SD-180 토야2 optList=[Black].
//   2. 색상이 아예 별도 godCd로 나뉜 경우 — 실측: 마이크로호즈키 ES-150-IV(아사모야)/-NV(요조라)/
//      -OR(히구레)가 3개 godCd. v1은 안전하게 godCd별 개별 groupId(잘못 병합보다 과분할이 안전).
const BASE = 'https://www.snowpeak.co.kr';
const API = `${BASE}/restapi/god/goods`;
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const fetchJson = async (url) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (r.ok) return r.json();
      if (r.status === 404) return null;
    } catch (e) {
      /* 재시도 */
    }
    await new Promise((res) => setTimeout(res, 400 * (attempt + 1)));
  }
  return null;
};

const slugify = (s) =>
  (s || '')
    .trim()
    .toLowerCase()
    .replace(/\+/g, '-plus')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣-]/g, '');

// ── 한글 로마자 표기(RR) — godEngNm이 비어있을 때 폴백용.
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
  (koreanText || '')
    .split(/(\s+)/)
    .map((t) => (/\s+/.test(t) ? t : romanizeToken(t)))
    .join('');

// ── 색상 한글→영문(optNm이 한글일 때). 대부분 optNm이 이미 영문("Black","Ivory")이라 폴백용.
const COLOR_KO_EN = {
  화이트: 'White', 블랙: 'Black', 네이비: 'Navy', 베이지: 'Beige', 브라운: 'Brown', 샌드: 'Sand',
  올리브: 'Olive', 카키: 'Khaki', 그레이: 'Gray', 그린: 'Green', 레드: 'Red', 블루: 'Blue',
  아이보리: 'Ivory', 옐로우: 'Yellow', 오렌지: 'Orange', 탄: 'Tan', 실버: 'Silver', 골드: 'Gold',
  핑크: 'Pink', 퍼플: 'Purple', 차콜: 'Charcoal', 크림: 'Cream',
};
const colorToEnglish = (raw) => {
  const c = (raw || '').trim();
  if (!c) return '';
  if (/^[\x00-\x7F]+$/.test(c)) return c; // 이미 영문/ASCII
  const bilingual = c.match(/^[가-힣\s]+([A-Za-z][A-Za-z\s]*)$/);
  if (bilingual) return bilingual[1].trim();
  return COLOR_KO_EN[c] || romanizeName(c);
};

// ⚠ 스노우피크는 색상 옵션(optNm)이 영문뿐이다(WHITE/CHARCOAL/GREIGE). colorKorean은 한글이어야
// 하므로 표준 한글 색상 표기로 변환한다. 복합색(Darkolive/Light Green/Charcoal×Ivory)은 토큰 분해.
const COLOR_EN_KO = {
  black: '블랙', white: '화이트', grey: '그레이', gray: '그레이', olive: '올리브', beige: '베이지',
  navy: '네이비', greige: '그레이지', foliage: '폴리지', foriage: '폴리지', charcoal: '차콜', blue: '블루',
  ivory: '아이보리', orange: '오렌지', khaki: '카키', brown: '브라운', coyote: '코요테', indigo: '인디고',
  ecru: '에크루', purple: '퍼플', mustard: '머스타드', sage: '세이지', burgundy: '버건디', pink: '핑크',
  yellow: '옐로우', red: '레드', green: '그린', camel: '카멜', titanium: '티타늄', oatmeal: '오트밀',
  oat: '오트', slate: '슬레이트', ice: '아이스', sax: '삭스', balsam: '발삼', forest: '포레스트',
  ash: '애쉬', mix: '믹스', dark: '다크', light: '라이트', off: '오프', deep: '딥', sky: '스카이', pro: '프로',
  forestgreen: '포레스트그린', slateblue: '슬레이트블루', iceblue: '아이스블루', darkolive: '다크올리브',
};
// 붙여쓴 복합색(Lightgrey/Whiteblue/Charcoalblack)을 사전 단어로 그리디 분해(긴 단어 우선).
const COLOR_WORDS = Object.keys(COLOR_EN_KO).sort((a, b) => b.length - a.length);
const splitColorWord = (t) => {
  const lower = t.toLowerCase();
  if (COLOR_EN_KO[lower]) return COLOR_EN_KO[lower];
  let rest = lower;
  const out = [];
  while (rest) {
    const w = COLOR_WORDS.find((x) => rest.startsWith(x));
    if (!w) return t; // 완전 분해 실패 → 원본 유지
    out.push(COLOR_EN_KO[w]);
    rest = rest.slice(w.length);
  }
  return out.join('');
};
const colorToKorean = (raw) => {
  const c = (raw || '').trim();
  if (!c) return '';
  if (/[가-힣]/.test(c)) return c; // 이미 한글
  if (/^[0-9a-f]{6}$/i.test(c)) return ''; // hex 코드 누출(예: "000000") — 색상명 아님
  return c
    .split(/\s*×\s*/) // 조합색 "Charcoal×Ivory"
    .map((part) =>
      part
        .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase 분리
        .split(/[\s.]+/)
        .filter(Boolean)
        .filter((t) => COLOR_EN_KO[t.toLowerCase()] || !/^[A-Z]{1,3}$/.test(t)) // 미상 짧은대문자코드(CH/BD) 제거
        .map(splitColorWord)
        .join('')
    )
    .filter(Boolean)
    .join('×');
};

// ── 카테고리(cateCd → 내부 분류). 상당수는 상품명 키워드로 세분류. 세부 카테고리부터 크롤해
//    godCd별 첫 분류를 확정하고, 마지막에 0100(Gear 전체)으로 누락분을 이름으로 분류한다.
// 세부 카테고리부터(분류 확정) → 전체(0100 Gear / 0200 Apparel)로 누락분 수집. godCd 전역 dedup.
const GEAR_CATEGORIES = ['0106', '0108', '0110', '0111', '0113', '0114', '0116', '0117', '0119', '0121', '0137', '0139', '0100'];
const APPAREL_CATEGORIES = ['0203', '0209', '0204', '0210', '0205', '0206', '0211', '0200'];
const CATE_NAME = {
  '0106': '텐트,타프&쉘터', '0108': '테이블&체어', '0110': '침낭&침구류', '0111': '스토브&랜턴',
  '0113': 'IGT', '0114': '식기&쿠커', '0116': '파이어&그릴', '0117': '수납 가방&쿨러',
  '0119': '도그', '0121': '마운틴&백패킹', '0137': 'Lifestyle', '0139': '부품', '0100': 'Gear',
  '0203': 'TOPS', '0209': 'OUTER', '0204': 'BOTTOMS', '0210': '원피스&스커트', '0205': 'ACCESSORIES',
  '0206': 'DOG WEAR', '0211': '설봉제 한정', '0200': 'Apparel',
};

// 어패럴 액세서리(0205) — 잡화라 상품명 키워드로 세분류.
const classifyAccessory = (n) => {
  if (/선글라스|sunglass|아이웨어|eyewear/i.test(n)) return 'sunglasses';
  if (/장갑|글러브|glove|미튼|mitten/i.test(n)) return 'gloves';
  if (/백팩|backpack|배낭|러커|rucksack/i.test(n)) return 'backpack';
  if (/백|bag|가방|토트|tote|사코슈|sacoche|월렛|wallet|파우치|pouch|케이스|case|주머니/i.test(n)) return 'pouch';
  return 'clothing'; // 캡/모자/비니/양말/샌들/벨트/스카프 등 착용류
};

const classify = (cateCd, name) => {
  const n = name || '';
  switch (cateCd) {
    case '0106': // 텐트,타프&쉘터
      if (/타프|tarp/i.test(n)) return 'tarp';
      if (/쉘터|shelter|리빙쉘|스크린|screen|타프쉘/i.test(n)) return 'shelter';
      return 'tent';
    case '0108': // 테이블&체어
      if (/체어|chair|의자|스툴|stool|벤치|bench|소파|sofa/i.test(n)) return 'chair';
      return 'table';
    case '0110': // 침낭&침구류
      if (/매트|mat|패드|pad|코트|cot/i.test(n)) return 'mat';
      if (/필로우|pillow|베개/i.test(n)) return 'pillow';
      return 'sleeping_bag';
    case '0111': // 스토브&랜턴
      if (/랜턴|lantern|라이트|light|호즈키|hozuki|테이블등|등$|램프|lamp/i.test(n)) return 'lighting';
      if (/토치|torch/i.test(n)) return 'torch';
      return 'stove';
    case '0113': // IGT (아이언그릴테이블 시스템)
      if (/철판|그리들|griddle|팬|\bpan|더치|플레이트|plate|그릴|grill/i.test(n)) return 'cookware_etc';
      return 'table';
    case '0114': // 식기&쿠커
      if (/컵|cup|머그|mug|텀블러|tumbler|샴페인|와인|잔/i.test(n)) return 'cup';
      if (/보틀|bottle|물통|플라스크|flask|보온병|주전자|케틀|kettle/i.test(n)) return 'bottle';
      if (/볼$|보울|bowl|접시|plate|디쉬|dish|트레이|tray/i.test(n)) return 'bowl';
      if (/커틀러리|cutlery|스푼|spoon|포크|fork|나이프|knife|수저|젓가락|칼|커틀/i.test(n)) return 'cutlery';
      return 'cookware_etc';
    case '0116': // 파이어&그릴
      if (/테이블|table/i.test(n)) return 'table';
      return 'cookware_etc';
    case '0117': // 수납 가방&쿨러
      if (/배낭|백팩|backpack|러커|rucksack|팩\b/i.test(n)) return 'backpack';
      return 'pouch';
    case '0119': // 도그
      return 'etc';
    case '0121': // 마운틴&백패킹
      if (/타프|tarp/i.test(n)) return 'tarp';
      if (/쉘터|shelter/i.test(n)) return 'shelter';
      if (/텐트|tent/i.test(n)) return 'tent';
      if (/침낭|슬리핑|sleeping/i.test(n)) return 'sleeping_bag';
      if (/매트|mat|패드/i.test(n)) return 'mat';
      if (/스토브|버너|stove|burner/i.test(n)) return 'stove';
      if (/쿠커|팟|\bpot|cook|케틀/i.test(n)) return 'cookware_etc';
      return 'backpack';
    case '0137': // Lifestyle
      if (/백팩|backpack|배낭/i.test(n)) return 'backpack';
      if (/백|bag|가방|토트|tote|파우치|pouch|월렛|wallet/i.test(n)) return 'pouch';
      if (/자켓|jacket|팬츠|pants|셔츠|shirt|웨어|wear|장갑|글러브|glove|캡|cap|비니|모자|hat|삭스|sock/i.test(n)) return 'clothing';
      return 'etc';
    case '0139': // 부품
      if (/폴|pole|펙|peg|팩\b|스트링|string|로프|rope|가이|guy|프레임|frame|다리|leg|캡|cap|시트|sheet|스토퍼/i.test(n)) return 'tent_acc';
      return 'etc';
    // ── 어패럴 ──
    case '0203': // TOPS
    case '0209': // OUTER
    case '0204': // BOTTOMS
    case '0210': // 원피스&스커트
    case '0211': // 설봉제 한정(대부분 의류)
      return 'clothing';
    case '0205': // ACCESSORIES
      return classifyAccessory(n);
    case '0206': // DOG WEAR
      return 'etc';
    case '0200': // Apparel 전체 — 누락분, 이름으로 분류(대부분 의류)
      if (/선글라스|sunglass/i.test(n)) return 'sunglasses';
      if (/장갑|글러브|glove|미튼/i.test(n)) return 'gloves';
      if (/백팩|backpack|배낭/i.test(n)) return 'backpack';
      if (/\b백\b|bag|가방|토트|tote|사코슈|sacoche|월렛|wallet|파우치|pouch/i.test(n)) return 'pouch';
      return 'clothing';
    default: // 0100 Gear 전체 — 세부 카테고리에 못 잡힌 누락분, 이름으로 최선 분류
      if (/타프|tarp/i.test(n)) return 'tarp';
      if (/쉘터|shelter/i.test(n)) return 'shelter';
      if (/텐트|tent|돔|dome/i.test(n)) return 'tent';
      if (/체어|chair|의자|스툴/i.test(n)) return 'chair';
      if (/테이블|table/i.test(n)) return 'table';
      if (/침낭|슬리핑|sleeping/i.test(n)) return 'sleeping_bag';
      if (/매트|mat|패드/i.test(n)) return 'mat';
      if (/필로우|pillow|베개/i.test(n)) return 'pillow';
      if (/랜턴|lantern|라이트|light|호즈키/i.test(n)) return 'lighting';
      if (/토치|torch/i.test(n)) return 'torch';
      if (/버너|스토브|stove|burner/i.test(n)) return 'stove';
      if (/컵|cup|머그|mug/i.test(n)) return 'cup';
      if (/보틀|bottle|물통|보온병/i.test(n)) return 'bottle';
      if (/볼$|보울|bowl|접시|plate/i.test(n)) return 'bowl';
      if (/스푼|포크|나이프|커틀러리|cutlery|수저/i.test(n)) return 'cutlery';
      if (/냄비|쿠커|cooker|\bpot|팬|더치|케틀|그릴|grill|화로|takibi/i.test(n)) return 'cookware_etc';
      if (/배낭|백팩|backpack/i.test(n)) return 'backpack';
      if (/백|bag|가방|파우치|pouch|더플|duffel|케이스|case|큐브/i.test(n)) return 'pouch';
      if (/폴|pole|펙|peg|스트링|로프/i.test(n)) return 'tent_acc';
      return 'etc';
  }
};

// ⚠ 단위가 유니코드 호환 문자로 오는 상품이 있다(실측: 윈젤2 "5.1㎏", 츠치나베 "0.9㎏" — ㎏는
// ASCII "kg"가 아니라 단일문자 U+339F). ASCII로 정규화하지 않으면 무게 정규식이 통째로 놓친다.
const normalizeUnits = (s) =>
  (s || '')
    .replace(/㎏/g, 'kg')
    .replace(/㎎/g, 'mg')
    .replace(/ｋｇ/gi, 'kg')
    .replace(/ｇ/g, 'g')
    .replace(/㎝/g, 'cm')
    .replace(/㎜/g, 'mm');

// ── 스펙 테이블 파싱 ──────────────────────────────────────────────────
const parseSpecTable = (godSizeHtml) => {
  const spec = {};
  if (!godSizeHtml) return spec;
  const clean = normalizeUnits(godSizeHtml)
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/\r?\n/g, '')
    .replace(/>\s+</g, '><');
  // ⚠ th/td에 style 등 속성이 붙는 상품이 있다(실측: BD-030R "<th style=...>중량</th>") — 속성 허용.
  const re = /<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/g;
  let m;
  while ((m = re.exec(clean))) {
    const label = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const value = m[2].replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
    if (label) spec[label] = value;
  }
  return spec;
};

// 무게 값 문자열에서 첫 (숫자+kg|g)만 뽑아 g로 환산. "약 25.5kg", "5g(전지 제외)", "본체 / 1.9kg" 등.
// 테이블에 중량 행이 없으면(실측: BD-066/103/104는 <table>이 아닌 인라인 텍스트 "총중량 약 2,600g")
// godSize 원문 텍스트에서 "중량/총중량/무게 ... 숫자g|kg"를 폴백으로 찾는다.
const WEIGHT_VAL_RE = /(\d[\d,]*(?:\.\d+)?)\s*(kg|g)\b/i;
const WEIGHT_TOK_RE = /(\d[\d,]*(?:\.\d+)?)\s*(kg|g)\b/gi;
const tokToG = (num, unit) => {
  const v = parseFloat(num.replace(/,/g, ''));
  return unit.toLowerCase() === 'kg' ? v * 1000 : v;
};
const parseWeightG = (spec, godSizeHtml) => {
  // ⚠ '무게'/'중량'을 각각 시도한다 — 한 상품에 둘 다 있고 하나가 다른 뜻(수납 치수)일 수 있다
  //    (실측: TP-940 메락 Pro. → 무게=18kg, 중량=수납케이스 치수). 실제 kg/g가 파싱되는 첫 값 사용.
  for (const key of ['무게', '중량', '총중량', 'weight', 'Weight']) {
    const raw = spec[key];
    const m = raw && raw.match(WEIGHT_VAL_RE);
    if (m) return Math.round(tokToG(m[1], m[2]));
  }
  // 테이블에 무게가 없으면 godSize 원문 텍스트 폴백. 라벨 뒤 구간의 모든 kg/g를 합산한다
  // (실측: 매트세트 "중량 이불 / 1.3kg, 매트 / 0.9kg" 부품 분리 → 총중량 2.2kg).
  if (godSizeHtml) {
    const txt = normalizeUnits(godSizeHtml).replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ');
    const seg = txt.match(/(?:총\s*)?(?:중\s*량|무\s*게)\s*[:\s]*([\s\S]{0,90})/i);
    if (seg) {
      // 다음 스펙 항목 라벨 전까지만 자른다(온도/사이즈/원산지 등의 숫자 오염 방지).
      const after = seg[1].split(/온도|사이즈|원산지|제조|색상|용량|대응|수납|재질|세트\s*내용/)[0];
      let sum = 0;
      for (const m of after.matchAll(WEIGHT_TOK_RE)) sum += tokToG(m[1], m[2]);
      if (sum >= 2) return Math.round(sum);
    }
  }
  return 0;
};

// ⚠ 스노우피크 상세이미지(godDtl <img>)는 스펙 없는 라이프스타일 사진이라 OCR 무의미(실측 검증).
// 단, 일부 상품은 스펙 테이블(godSize)엔 무게가 없지만 상세설명(godDtl) "텍스트"에 있다(실측:
// 제카 "무게 30kg", RB호즈키 "무게 280g", 호즈키쉐이드 "무게 25g"). 라벨 인접 단일값만 보수적으로.
const parseWeightFromDtl = (godDtl) => {
  if (!godDtl) return 0;
  const txt = normalizeUnits(godDtl).replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ');
  const m = txt.match(/(?:총\s*)?(?:중\s*량|무\s*게)[^가-힣\d]{0,12}(\d[\d,]*(?:\.\d+)?)\s*(kg|g)\b/i);
  return m ? Math.round(tokToG(m[1], m[2])) : 0;
};

const findSpec = (spec, keys) => {
  for (const k of Object.keys(spec)) {
    if (keys.some((kk) => k.includes(kk))) return spec[k];
  }
  return '';
};

// 카테고리별 specs 스키마 채우기(추출 가능한 것만). ⚠ 반드시 specs-schema.js의 그 카테고리
// 허용 키만 쓴다(예: 텐트는 material 아님 flyMaterial, 백팩은 capacity 아님 volume, 침낭·랜턴은
// material 키 자체가 없음). name은 의류의 방수/후드/충전재 판별에 쓴다.
const buildSpecs = (category, spec, name = '') => {
  const s = {};
  const material = findSpec(spec, ['재질', '소재', '원단']);
  const capacity = findSpec(spec, ['용량', '만수 용량']);
  const persons = findSpec(spec, ['대응인원', '대응 인원', '수용인원']);
  const waterproof = findSpec(spec, ['방수', '내수압']);
  const packedSize = findSpec(spec, ['수납 사이즈', '수납사이즈', '수납 크기', '수납케이스 사이즈']);
  const size = findSpec(spec, ['사이즈', '크기', '치수']);
  const maxLoad = findSpec(spec, ['내하중', '최대하중', '하중']);
  const setMat = () => {
    if (material) s.material = material;
  };

  switch (category) {
    case 'tent':
    case 'tarp':
    case 'shelter':
      if (persons || capacity) s.capacity = persons || capacity;
      if (material) s.flyMaterial = material;
      if (waterproof) s.waterproofRating = waterproof;
      break;
    case 'sleeping_bag':
      if (material && /충전재|다운|down|폴리에스테르|화섬/i.test(material)) s.fillMaterial = /다운|down/i.test(material) ? 'down' : 'synthetic';
      if (findSpec(spec, ['사용 온도', '온도', '한계 온도'])) s.comfortTemp = findSpec(spec, ['사용 온도', '온도']);
      break;
    case 'mat':
      setMat();
      if (findSpec(spec, ['두께'])) s.thickness = findSpec(spec, ['두께']);
      if (size) s.openSize = size;
      break;
    case 'lighting':
      if (findSpec(spec, ['밝기', '루멘', 'lm'])) s.maxBrightness = findSpec(spec, ['밝기', '루멘']);
      if (findSpec(spec, ['사용 전원', '전원', '전지', '배터리'])) s.batteryType = findSpec(spec, ['사용 전원', '전원', '전지']);
      if (findSpec(spec, ['연속 점등', '점등 시간', '사용 시간'])) s.maxRuntime = findSpec(spec, ['연속 점등', '점등 시간']);
      if (waterproof) s.waterproofRating = waterproof;
      break;
    case 'stove':
    case 'torch':
      setMat();
      if (findSpec(spec, ['출력', '화력', '발열량'])) s.output = findSpec(spec, ['출력', '화력', '발열량']);
      break;
    case 'cup':
    case 'bowl':
    case 'bottle':
    case 'cookware_etc':
      setMat();
      if (capacity) s.capacity = capacity;
      break;
    case 'chair':
      setMat();
      if (packedSize) s.packedSize = packedSize;
      if (maxLoad) s.maxLoad = maxLoad;
      break;
    case 'table':
      if (material) s.topMaterial = material;
      if (packedSize) s.packedSize = packedSize;
      if (maxLoad) s.maxLoad = maxLoad;
      break;
    case 'backpack':
      setMat();
      if (capacity) s.volume = capacity; // ⚠ 백팩 스키마는 capacity 아님 volume
      break;
    case 'pouch':
      setMat();
      if (capacity) s.capacity = capacity;
      break;
    case 'cutlery': // 스키마: material, isSet (size 아님)
      setMat();
      break;
    case 'clothing': {
      setMat();
      const hay = `${name} ${material}`;
      if (/GORE-?TEX|고어텍스|방수|워터프루프|waterproof|water-?repellent|발수/i.test(hay)) s.isWaterproof = true;
      if (/후드|hood/i.test(name)) s.hasHood = true;
      if (/다운|down|구스|goose|덕다운/i.test(hay)) s.fillMaterial = 'down';
      else if (/화섬|신세틱|synthetic|프리마로프트|primaloft|인슐레이션/i.test(hay)) s.fillMaterial = 'synthetic';
      break;
    }
    case 'gloves':
    case 'gaiter':
      setMat();
      if (/방수|waterproof|GORE-?TEX/i.test(`${name} ${material}`)) s.isWaterproof = true;
      break;
    case 'sunglasses':
      break; // 스키마: lensMaterial/uvProtection/isPolarized — 스펙테이블에서 추출 불가
    default: // etc/tent_acc/pillow/food/towel/hand_warmer/shovel/hammer/microspikes → material,size
      setMat();
      if (size) s.size = size;
      break;
  }
  return s;
};

// ── 리스팅(페이지네이션) ──────────────────────────────────────────────
const fetchCategoryItems = async (cateCd) => {
  const items = [];
  let page = 1;
  let totalPages = 1;
  do {
    const j = await fetchJson(`${API}/${cateCd}/list?sortFlag=REG&soldOutExcYn=N&size=100&page=${page}`);
    if (!j || !j.items) break;
    items.push(...j.items);
    totalPages = j.totalPages || 1;
    page += 1;
  } while (page <= totalPages);
  return items;
};

// ── 상세 → row(들) ────────────────────────────────────────────────────
const buildRows = (listItem, detail, category) => {
  const godCd = detail.godCd;
  // ⚠ godNm/godEngNm 필드가 상품마다 뒤바뀐다 — 필드 이름을 믿지 말고 "한글 든 쪽"을 nameKorean,
  //    "영문 쪽"을 name으로 고른다. 실측 3가지: (a) 정상 godNm=소프트버킷12/godEngNm=Soft Bucket 12,
  //    (b) 뒤바뀜 godNm=Gear Tote/godEngNm=기어 토트(355개!), (c) 둘 다 한글 윈젤2/윈젤2(→영문은 음역),
  //    (d) 둘 다 영문 Land Lock T-Shirt(한글명 자체가 없음 — 40개, 불가피).
  const raw1 = (detail.godNm || listItem.godNm || '').trim();
  const raw2 = (detail.godEngNm || '').trim();
  const k1 = /[가-힣]/.test(raw1);
  const k2 = /[가-힣]/.test(raw2);
  let nameKorean, nameEn;
  if (!k1 && k2) {
    nameKorean = raw2;
    nameEn = raw1;
  } else if (k1 && k2) {
    nameKorean = raw1;
    nameEn = romanizeName(raw1);
  } else if (k1 && !k2) {
    nameKorean = raw1;
    nameEn = raw2 || romanizeName(raw1);
  } else {
    nameKorean = raw1 || raw2;
    nameEn = raw1 || raw2;
  }
  const spec = parseSpecTable(detail.godSize);
  const weight = parseWeightG(spec, detail.godSize) || parseWeightFromDtl(detail.godDtl);
  const specs = buildSpecs(category, spec, nameKorean);
  const mainImage = (detail.imgUrls && detail.imgUrls[0]) || listItem.imgUrl || '';
  const colorImg = {};
  for (const c of listItem.colorList || []) colorImg[c.optNm] = c.imgUrl;

  const rowBase = {
    groupId: `snowpeak_${godCd.toLowerCase()}`,
    category,
    company: 'snowpeak',
    companyKorean: '스노우피크',
    name: nameEn,
    nameKorean,
    weight,
    specs,
    imageUrl: mainImage,
    _detailUrl: `${BASE}/products/detail?godCd=${godCd}`,
    _source: `${BASE}/products/detail?godCd=${godCd}`,
    _godCd: godCd,
  };

  const rows = [];
  // ⚠ optList/itemList에 같은 (색상,사이즈) 조합이 중복으로 들어오는 상품이 있다(실측: 티셔츠
  //    White/XL 2회, MM4510-TS01 GREEN 빈사이즈 3회) → (color,size) dedup으로 접는다.
  const seenVar = new Set();
  const optList = detail.optList && detail.optList.length ? detail.optList : [{ optNm: '', itemList: [{ optVal: '' }] }];
  for (const opt of optList) {
    const colorKo = (opt.optNm || '').trim();
    const items = opt.itemList && opt.itemList.length ? opt.itemList : [{ optVal: '' }];
    for (const it of items) {
      // ⚠ 사이즈에 내부 순번코드가 붙는 상품이 있다(실측: SP-TS-24SU001 "M(03)","L(04)") → 제거.
      const sizeRaw = (it.optVal || '').trim().replace(/\s*\(\d+\)\s*$/, '');
      const key = `${colorKo}|${sizeRaw}`;
      if (seenVar.has(key)) continue;
      seenVar.add(key);
      // colorKorean이 빈값이면(hex 코드 누출 등 색상명 아님) color도 비운다 — 페어 유지.
      const colorKr = colorKo ? colorToKorean(colorKo) : '';
      rows.push({
        ...rowBase,
        color: colorKr ? colorToEnglish(colorKo) : '',
        colorKorean: colorKr,
        size: sizeRaw ? (/[가-힣]/.test(sizeRaw) ? romanizeName(sizeRaw) : sizeRaw) : '',
        sizeKorean: sizeRaw,
        imageUrl: (colorKo && colorImg[colorKo]) || mainImage,
        _price: it.salePr || listItem.salePr || 0,
      });
    }
  }
  return rows;
};

export default {
  name: 'snowpeak',
  company: 'snowpeak',
  companyKorean: '스노우피크',
  baseUrl: BASE,
  defaultCategories: [...GEAR_CATEGORIES, ...APPAREL_CATEGORIES],
  crawl: async (browser, { categoryUrls } = {}) => {
    const cats = categoryUrls && categoryUrls.length ? categoryUrls : [...GEAR_CATEGORIES, ...APPAREL_CATEGORIES];
    const seen = new Set();
    const rows = [];
    for (const cateCd of cats) {
      const items = await fetchCategoryItems(cateCd);
      let n = 0;
      for (const it of items) {
        if (seen.has(it.godCd)) continue;
        seen.add(it.godCd);
        const detail = await fetchJson(`${API}/${it.godCd}`);
        if (!detail) continue;
        const category = classify(cateCd, detail.godNm || it.godNm);
        rows.push(...buildRows(it, detail, category));
        n += 1;
        if (n % 25 === 0) console.log(`[snowpeak]   ${CATE_NAME[cateCd] || cateCd} ${n}/${items.length}`);
      }
      console.log(`[snowpeak] ${CATE_NAME[cateCd] || cateCd}(${cateCd}) 신규 ${n}개 (누적 ${rows.length}행)`);
    }
    return rows;
  },
};

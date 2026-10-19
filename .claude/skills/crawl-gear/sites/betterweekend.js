// 베러위켄드(betterweekend.co.kr) — 브랜드 공홈이 아니라 국내 아웃도어 매거진의 "GEAR" DB(Rhymix CMS).
// 멀티브랜드(약 80개 브랜드) 장비 221개가 /gear 한 페이지에 전부 서버렌더된다(페이지네이션 없음).
//  · 리스팅: /gear 의 <article class="bw-gear-card" data-mid="..."> 카드(브랜드/이름/썸네일/게시판 mid).
//  · 상세:   /index.php?mid=gear&gear_srl=N — "SPECIFICATIONS" 아래 라벨/값 leaf 쌍(무게·스펙 전부 텍스트, OCR 불필요).
//            라벨은 게시판(mid)마다 다르다(의류=한글 "무게 남성/여성", 텐트·백팩·침낭=영문 "PACKAGED WEIGHT/WEIGHT").
//            값 안의 다중선택 구분자는 "|@|".
// ⚠ 매거진 DB라 색상 옵션이 없고 이름은 영문뿐 → nameKorean은 아래 NAMES 표(음역)로 채운다.
// ⚠ company는 카드의 브랜드 표기가 제각각(arcteryx/Arc'teryx/Arc’teryx, 오타 Feathered Friedns 등)이라
//    BRANDS 표로 정규화한다. 이미 공홈 크롤이 있는 브랜드는 EXCLUDED_BRANDS로 제외(중복·표기 충돌 방지).
// ⚠ 의류/신발은 남녀 무게가 따로 있으면 size "Men's"/"Women's"(남성/여성) 두 행으로 전개한다.
// ⚠ 33개 카테고리 밖 품목: 신발→clothing, 칼·쿨러→cookware_etc, 시계·바이크팩→etc (사용자 지정).
import { execFileSync } from 'node:child_process';

const BASE = 'https://betterweekend.co.kr';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = (ms) => execFileSync('sleep', [String(ms / 1000)]);
const curlGet = (url, marker = null, retries = 4) => {
  for (let i = 0; i < retries; i++) {
    try {
      const out = execFileSync('curl', ['-sL', '--compressed', '-A', UA, url], { maxBuffer: 64 * 1024 * 1024, encoding: 'utf-8' });
      if (out && out.length > 500 && (!marker || out.includes(marker))) return out;
    } catch (e) {
      /* 재시도 */
    }
    sleep(500 * (i + 1));
  }
  return '';
};

const decodeEntities = (s) =>
  s
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');

// ── 이미 공홈(또는 더기어샵) 크롤이 있는 브랜드 → 제외 ──
const EXCLUDED_BRANDS = /^(black ?diamond|back diamond|big agnes|nemo|arc.?teryx|rab|scarpa|sierra ?designs|kolon ?sport|kolonsport|sea to summit|cayl|samaya|msr|therm-a-rest|evernew)$/i;

// ── Firestore에 사용자 수동입력으로 이미 있는 동일 모델 → 제외(2026-09 대조) ──
const EXCLUDED_SRL = {
  85053: 'Liteway 일루션 듀오 텐트',
  81413: 'Mountain Rover 타르시어 프로 60L(M/W)',
  80407: 'Mountain Rover 타르시어 18',
  63235: 'Mountain Rover 타르시어 40',
  70457: 'Hiker Workshop TYPE-2 light 17L',
  71196: 'Hiker Workshop TYPE-2 light (DCF)',
  74195: 'Hiker Workshop TYPE-1 7L — 공식몰 라인업에 TYPE-1(7L, 200g, DCF) 하나뿐, BW "TYPE-1 DCF"(8L/200g/DCF)와 동일 제품',
  61240: 'Nike Air Zoom Terra Kiger 6 — 사이트에 이미지가 아예 없음(카드 NO IMAGE, og:image 없음, 연결 기사 없음) → imageUrl 필수라 제외',
};

// ── 스펙표에 무게가 없어 다른 출처로 채운 것 ──
// 82633: 베러위켄드 기사 document_srl=82617 "실제 측정한 무게는 남성용 US10 한쪽 기준 492g, 여성용 US7 한쪽 기준 371g"
// 68366: road.cc 리뷰(content/review/…-273837) "Weight: 69g"
// (KEEN Zerraport II는 판매처마다 한 켤레/한 짝 기준이 불명확, Salomon Trail Grit 3L은 출처 없음 → 0 유지)
const WEIGHT_OVERRIDE = {
  82633: { men: '492', women: '371' },
  68366: { weight: '69' },
};

// ── 브랜드 정규화: 카드 표기(소문자 비교) → [company, companyKorean]. 기존 DB 표기가 있으면 그대로 따른다. ──
const BRANDS = {
  'peak performance': ['Peak Performance', '피크퍼포먼스'],
  patagonia: ['Patagonia', '파타고니아'],
  'basis mountain gear': ['Basis Mountain Gear', '베이시스마운틴기어'],
  'black yak': ['Black Yak', '블랙야크'],
  heritage: ['Heritage', '헤리티지'],
  'feathered friends': ['Feathered Friends', '페더드프렌즈'],
  'feathered friedns': ['Feathered Friends', '페더드프렌즈'],
  ortovox: ['Ortovox', '오토복스'], // 공식 수입사(ortovoxkorea.com) 표기
  lowa: ['LOWA', '로바'],
  salomon: ['Salomon', '살로몬'],
  toadfish: ['Toadfish', '토드피쉬'],
  nitecore: ['NITECORE', '나이트코어'],
  altra: ['Altra', '알트라'],
  'hoka one one': ['HOKA', '호카'],
  montura: ['Montura', '몬츄라'],
  liteway: ['Liteway', '라이트웨이'],
  palante: ["Pa'lante", '파란테'],
  valandre: ['Valandre', '발란드레'],
  coros: ['Coros', '코로스'],
  'fjallraven,specialized': ['Fjallraven', '피엘라벤'],
  fjallraven: ['Fjallraven', '피엘라벤'],
  'new balance': ['New Balance', '뉴발란스'],
  'teton bros': ['Teton Bros', '티톤브로스'],
  teva: ['Teva', '테바'],
  'the north face': ['The North Face', '노스페이스'],
  petzl: ['Petzl', '페츨'],
  'haglöfs': ['Haglöfs', '하글로프스'],
  haglofs: ['Haglöfs', '하글로프스'],
  mountainrover: ['Mountain Rover', '마운틴로버'],
  'mountain rover': ['Mountain Rover', '마운틴로버'],
  osprey: ['Osprey', '오스프리'],
  montane: ['Montane', '몬테인'],
  'mountain hardwear': ['Mountain Hardwear', '마운틴하드웨어'],
  leki: ['LEKI', '레키'],
  'la sportiva': ['La Sportiva', '라스포르티바'],
  'outdoor reasearch': ['Outdoor Research', '아웃도어리서치'],
  opinel: ['Opinel', '오피넬'],
  klymit: ['Klymit', '클라이밋'],
  biolite: ['BioLite', '바이오라이트'],
  modl: ['MODL', '모들'],
  keen: ['KEEN', '킨'],
  on: ['On', '온'],
  rivers: ['Rivers', '리버스'],
  'hiker workshop': ['Hiker Workshop', '하이커워크샵'],
  hydrapak: ['HydraPak', '하이드라팩'],
  'goal zero': ['Goal Zero', '골제로'],
  fabric: ['Fabric', '패브릭'],
  akinod: ['Akinod', '아키노드'],
  brooks: ['Brooks', '브룩스'],
  cornertrip: ['Cornertrip', '코너트립'],
  thule: ['Thule', '툴레'],
  omm: ['OMM', '오엠엠'],
  'g-shock': ['G-SHOCK', '지샥'],
  garmin: ['Garmin', '가민'],
  nike: ['Nike', '나이키'],
};

// ── 제품별 [영문명(브랜드 접두 제거·오타 교정), 한글명] + 필요 시 브랜드 교정 ──
// 카드 이름은 "브랜드 + 모델" 형태이고 오타(NITCECORE/Petzle/Teton Bors)도 있어 표로 확정한다.
// 한글명(2026-09 웹 검색 대조): 국내 공식몰·정식 판매처 표기가 있으면 그대로 따른다
//   (예: 팍사트·이에로·론픽·올림퍼스·까미노·매독스·마카루·다누비오 G 쟈켓·아이코 코어·아펙스·엑스 퓨즈·힐리움,
//    테크앰피비안·팍사트 팩·곤조 다운 자켓, 살로몬/호카/피엘라벤 등 "자켓" 표기 → 자켓, 파타고니아 공식몰은 "재킷").
//   국내 표기를 못 찾은 모델은
//   음역 + 한글 카테고리어(트레일 러닝화/백팩/샌들/매트/등산스틱 등). 헤드램프는 국내 통용어 "헤드랜턴".
//   MHW 텐트는 기존 수동입력(님버스 UL 1)과 같은 표기 방식을 따른다.
const NAMES = {
  97469: ['Helium Nova Down Jacket', '힐리움 노바 다운 자켓'],
  97367: ['Nano-Air Light Hoody (2026)', '나노-에어 라이트 후디 (2026)'],
  97293: ['Bare Sandal H01', '베어 샌들 H01'],
  97242: ['Tough Shield EX Cordura Standard Pants', '터프쉴드 EX 코듀라 스탠다드 팬츠'],
  97176: ['Crossover Dome Kaya', '크로스오버돔 카야 텐트'],
  96742: ["Murre Light 0 Women's Sleeping Bag", '머레 라이트 0 여성용 침낭'],
  93241: ['Downwool 270 Jacket', '다운울 270 자켓'],
  92592: ['Maddox Pro GTX LO SL', '매독스 프로 GTX LO SL'],
  89651: ['Trail Grit GORE-TEX 3L Jacket', '트레일 그릿 고어텍스 3L 자켓'],
  89342: ['S/LAB Ultra Glide', 'S/LAB 울트라 글라이드'],
  89362: ['Ultra Glide 3', '울트라 글라이드 3'],
  88235: ['Stowaway LED Lantern', '스토어웨이 LED 랜턴'],
  88203: ['X-Fuse Hooded Down Jacket', '엑스 퓨즈 후디드 다운 자켓'],
  86872: ['NU20 Classic Headlamp', 'NU20 클래식 헤드랜턴'],
  86508: ['UT27 Headlamp (2024)', 'UT27 헤드랜턴 (2024)'],
  86501: ['King MT 2 (2024)', '킹 MT 2 트레일 러닝화 (2024)'],
  86353: ['Speedgoat 6', '스피드고트 6'],
  86261: ['Olympus 6', '올림퍼스 6'],
  88337: ['Olympus 6 Hike Mid GTX', '올림퍼스 6 하이크 미드 GTX'],
  86059: ['Techamphibian 5', '테크앰피비안 5'],
  85919: ['Danubio G Jacket', '다누비오 G 쟈켓'],
  85019: ['V2 Pack', 'V2 백팩'],
  84146: ['Gonzo Jacket', '곤조 다운 자켓'],
  83394: ['Apex 2 Pro', '아펙스 2 프로'],
  83202: ['Specialized Handlebar Bag', '스페셜라이즈드 핸들바 백'],
  83148: ['Fresh Foam X More Trail V3 (2023)', '프레쉬폼 X 모어 트레일 V3 (2023)'],
  82786: ['Feather Rain Full Zip Jacket', '페더 레인 풀 집 자켓'],
  82633: ['Grandview GTX Low', '그랜드뷰 GTX 로우'],
  82539: ['Nano-Air Hoody', '나노-에어 후디'],
  82383: ['Tecton X', '텍톤 X'],
  82270: ['Wapiti Hoody', '와피티 후디'],
  82176: ['Trail Code GTX', '트레일코드 GTX'],
  82142: ['Summit Series Casaval Hoodie', '서밋 시리즈 카사발 후디'],
  81867: ['Tsurugi Jacket', '츠루기 자켓'],
  81596: ['Actik Core Headlamp', '액틱 코어 헤드랜턴'],
  81562: ['Särna Mimic Hood', '세르나 미믹 후드'],
  81073: ['Speedgoat 5', '스피드고트 5'],
  80641: ['Talon Earth 22', '탈론 어스 22'],
  80561: ['Slope Runner Exploration Pack 18L', '슬로프 러너 익스플로레이션 팩 18L'],
  79698: ['Fresh Foam X Hierro v7', '프레쉬폼 X 이에로 v7'],
  84047: ['Fresh Foam X Hierro v7 GTX', '프레쉬폼 X 이에로 v7 GTX'],
  89245: ['Fresh Foam X Hierro v9', '프레쉬폼 X 이에로 v9'],
  92627: ['Fresh Foam X Hierro v9 GTX', '프레쉬폼 X 이에로 v9 GTX'],
  79640: ['Lite-Speed Trail Pull-On', '라이트스피드 트레일 풀온 윈드 자켓'],
  79623: ['Trailblazer LT 20L', '트레일블레이저 LT 20L 백팩'],
  79119: ['Kaha GORE-TEX', '카하 고어텍스'],
  88754: ['Kaha 3 GTX', '카하 3 GTX'],
  78504: ['Slate Sky Jacket', '슬레이트 스카이 재킷'],
  78391: ['Dryzzle FUTURELIGHT Jacket', '드리즐 퓨처라이트 자켓'],
  78246: ['Stretch Ozonic Jacket', '스트레치 오조닉 자켓'],
  77987: ['Makalu FX Carbon Trekking Poles', '마카루 FX 카본 등산스틱'],
  77978: ['Mont Blanc', '몽블랑'],
  76794: ['Ultra Raptor II Mid GTX', '울트라 랩터 II 미드 GTX'],
  76494: ['Micro Nordic Down', '마이크로 노르딕 다운 자켓'],
  75793: ['UT27 Headlamp', 'UT27 헤드랜턴', 'nitecore'], // 카드 브랜드가 BioLite로 잘못 등록됨 → NITECORE
  75589: ['Micro Puff Hoody', '마이크로 퍼프 후디'],
  75565: ['SuperStrand LT Hoodie', '슈퍼스트랜드 LT 후디'],
  74557: ['N°12 Explore Tick Remover', 'No.12 익스플로러 틱 리무버 나이프'],
  74276: ['Explorer GTX Mid', '익스플로러 GTX 미드'],
  74568: ['Renegade GTX Mid', '레니게이드 GTX 미드'],
  83447: ['Renegade GTX Mid (MegaGrip)', '메가그립 레니게이드 GTX 미드'],
  83516: ['Camino Evo GTX', '까미노 에보 GTX'],
  73965: ['Everglow Light Tube XL', '에버글로우 라이트 튜브 XL 랜턴'],
  73794: ['Zinal', '지날'],
  73605: ['AlpenGlow 250 Lantern', '알펜글로우 250 랜턴'],
  73566: ['Odyssey 1 Advanced', '오디세이 1 어드밴스드'],
  73425: ['CU10 Backpack Light', 'CU10 백팩 라이트'],
  75429: ['HC65 V2 Headlamp', 'HC65 V2 헤드랜턴'],
  72418: ['MODL Bottle', '모들 보틀'],
  72285: ['High Coast Hydratic Jacket', '하이 코스트 하이드라틱 자켓'],
  71678: ['Zerraport II Sandal', '제라포트 2 샌들'],
  71345: ['Lone Peak 5', '론픽 5'],
  76985: ['Lone Peak 6', '론픽 6'],
  71254: ['Cloudultra', '클라우드울트라'],
  70758: ['Strato UL 2', '스트라토 UL 2'],
  70767: ['Nimbus UL 2', '님버스 UL 2'],
  70741: ['Ultra Light Mug', '울트라 라이트 머그'],
  70295: ['Street Cross', '스트리트 크로스 트레일 러닝화'],
  70042: ['SkyFlask 500ml', '스카이플라스크 500ml'],
  69986: ['Lighthouse Micro Charge Lantern', '라이트하우스 마이크로 차지 랜턴'],
  69149: ['NU17 Headlamp', 'NU17 헤드랜턴'],
  80625: ['NU33 Headlamp', 'NU33 헤드랜턴'],
  68366: ['Gripper Bottle BIKES BIKES BIKES 600ml', '그리퍼 보틀 BIKES BIKES BIKES 600ml'],
  68140: ['Utility Folding Knife 18H07 (Titanium)', '유틸리티 폴딩 나이프 18H07 (티타늄)'],
  67697: ['Eos Down Jacket', '이오스 다운 자켓'],
  67695: ['Ghost Whisperer/2 Hoody', '고스트 위스퍼러/2 후디'],
  67686: ['Down Sweater Hoody', '다운 스웨터 후디'],
  67677: ['Helios Hooded Jacket', '헬리오스 후드 다운 자켓'],
  66610: ['TenNine Hike GTX', '텐나인 하이크 GTX'],
  66163: ['Caldera 4', '칼데라 4'],
  66023: ['Headlamp 750', '헤드램프 750'],
  65561: ['Olympus 4', '올림퍼스 4'],
  64635: ['Paxat Pack 32L', '팍사트 팩 32L'],
  70408: ['Altvia Pack 36L', '알트비아 팩 36L'],
  63844: ['Packable Soft Cooler', '패커블 소프트 쿨러'],
  63690: ['Lightweight Sleeping Bag', '라이트웨이트 침낭'],
  63626: ['IKO CORE Headlamp', '아이코 코어 헤드랜턴'],
  63461: ['Fresh Foam Hierro V5', '프레쉬폼 이에로 V5'],
  69249: ['Fresh Foam Hierro V6', '프레쉬폼 이에로 V6'],
  63393: ['Chasm 70L', '캐즘 70L 더플백'],
  63342: ['Jandal', '잔달 샌들'],
  63312: ['Pegasus Trail 2', '페가수스 트레일 2'],
  63273: ['Classic 25 (2020)', '클래식 25 백팩 (2020)'],
  62548: ['Micro RCM Superlight Poles', '마이크로 RCM 슈퍼라이트 등산스틱'],
  62508: ['Torrent 2', '토렌트 2 트레일 러닝화'],
  62407: ['Hopara', '호파라'],
  62347: ['GBD-H1000', 'GBD-H1000 워치'],
  62283: ['Klymaloft Regular', '클라이마로프트 레귤러 매트'],
  61587: ['Forerunner 245 Music', '포러너 245 뮤직'],
  61466: ['MCT 12 Vario Carbon Poles', 'MCT 12 바리오 카본 등산스틱'],
  61364: ['Wildhorse 6', '와일드호스 6'],
  61266: ['Timp 2', '팀프 2'],
  70366: ['Timp 3', '팀프 3'],
  61240: ['Air Zoom Terra Kiger 6', '에어 줌 테라 카이거 6'],
};

// ── 게시판(mid) → 내부 카테고리 ──
const CATEGORY_MAP = {
  downjacket: 'clothing',
  insulatedjacket: 'clothing',
  rainjacket: 'clothing',
  windjacket: 'clothing',
  pants: 'clothing',
  shoes: 'clothing', // 사용자 지정: 신발은 의류로
  glove: 'gloves',
  tent: 'tent',
  sleepingbag: 'sleeping_bag',
  sleepingpad: 'mat',
  backpack: 'backpack',
  bikepack: 'etc', // 사용자 지정
  headlamp: 'lighting',
  poles: 'trekking_pole',
  watch: 'etc', // 사용자 지정
  hydration: 'bottle',
  chair: 'chair',
  cookware: 'cup', // Rivers 머그 1개
  knives: 'cookware_etc', // 사용자 지정: 칼 → 조리도구
  cooler: 'cookware_etc', // 사용자 지정: 쿨러 → 조리도구
  hammer: 'hammer',
  crampons: 'microspikes',
};

const CLOTHING_TYPE = {
  downjacket: '다운 재킷',
  insulatedjacket: '인슐레이션 재킷',
  rainjacket: '방수 재킷',
  windjacket: '윈드 재킷',
  pants: '팬츠',
};

const slugify = (s) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/°/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// ── 리스팅 ──
const parseListing = (html) =>
  [...html.matchAll(/<article\s+class="bw-gear-card"([\s\S]*?)<\/article>/g)].map((m) => {
    const c = m[1];
    const pick = (re) => {
      const r = c.match(re);
      return r ? decodeEntities(r[1].trim()) : '';
    };
    return {
      srl: pick(/gear_srl=(\d+)/),
      mid: pick(/data-mid="([^"]*)"/),
      brand: pick(/bw-gear-brand">\s*([\s\S]*?)\s*</),
      rawName: pick(/bw-gear-name">\s*([\s\S]*?)\s*</),
      thumb: pick(/<img\s+src="([^"]+)"/),
    };
  });

// ── 상세: SPECIFICATIONS ~ (RELATED CONTENT | AD) 사이의 라벨/값 쌍 ──
const parseSpecs = (html) => {
  const text = decodeEntities(
    html
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '')
      .replace(/<[^>]+>/g, '\n')
  );
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const i = lines.indexOf('SPECIFICATIONS');
  if (i < 0) return {};
  let j = lines.findIndex((l, k) => k > i && (l === 'RELATED CONTENT' || l === 'AD'));
  if (j < 0) j = lines.length;
  const body = lines.slice(i + 1, j);
  const out = {};
  for (let k = 0; k + 1 < body.length; k += 2) out[body[k]] = body[k + 1];
  return out;
};

const ogImage = (html) => {
  const m = html.match(/property="og:image"\s+content="([^"]+)"/) || html.match(/og:image"\s+content="([^"]+)"/);
  return m ? m[1].split('?')[0] : '';
};
const absImage = (thumb) => {
  const m = thumb.match(/\/files\/attach\/.+$/);
  return m ? `${BASE}${m[0]}` : '';
};

// ── 값 파서 ──
const num = (v) => {
  const m = String(v ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : '';
};
// ⚠ 쉼표는 천단위가 아니라 목록 구분자로도 쓰인다(폴 길이 "110,115,…,135") → 쉼표로 합치지 않는다.
const nums = (v) => (String(v ?? '').match(/\d+(?:\.\d+)?/g) || []).map(parseFloat);
const yesNo = (v) => {
  if (v === undefined || v === '') return '';
  if (/^(yes|포함|기본)/i.test(v)) return true;
  if (/^no/i.test(v)) return false;
  return '';
};
const multi = (v) => String(v ?? '').split('|@|').map((s) => s.trim()).filter(Boolean);

// 무게(g). 단위 표기가 없고, 10 미만 소수(예: 1.09, 2.1)는 kg 표기다.
// "405-715"(구성별 범위)는 최대(풀구성), "318, 360"/"510|530"(사이즈별)은 호출부에서 분리.
const toGrams = (v) => {
  const ns = nums(v);
  if (!ns.length) return 0;
  const n = /\d\s*-\s*\d/.test(v) ? Math.max(...ns) : ns[0];
  return n < 10 ? Math.round(n * 1000 * 100) / 100 : n;
};

const WEIGHT_LABELS = ['PACKAGED WEIGHT', 'WEIGHT', '수납 무게', '무게', '무게(개당)', '의자 무게', 'MINIMUM WEIGHT', '최소 무게'];
const baseWeight = (sp) => {
  for (const k of WEIGHT_LABELS) if (sp[k]) return toGrams(sp[k]);
  return 0;
};

// 방수 근거(FEATURES "Water Proof"·GTX·GORE-TEX)가 있을 때만 true, 없으면 추론하지 않고 ''.
const isWaterproofShoe = (name, sp) =>
  /water ?proof/i.test(sp.FEATURES || '') || /\bGTX\b|GORE-TEX/i.test(`${name} ${sp['테크놀로지'] || ''}`) ? true : '';
const fillKind = (v) => {
  if (!v) return '';
  if (/down/i.test(v)) return 'down';
  return 'synthetic';
};

const buildSpecs = (cat, mid, name, sp) => {
  if (cat === 'clothing') {
    if (mid === 'shoes') {
      const use = multi(sp['최적 사용']);
      const type = /sandal/i.test(`${sp['신발 유형']} ${name}`)
        ? '샌들'
        : use.includes('Trail running') && !use.includes('Hiking')
          ? '트레일 러닝화'
          : use.includes('Water Sports')
            ? '워터 슈즈'
            : '등산화';
      return { type, material: sp['갑피'] || '', isWaterproof: isWaterproofShoe(name, sp), fillMaterial: '', hasHood: false };
    }
    const fill = sp['충전재'] || sp['층전재'] || '';
    return {
      type: CLOTHING_TYPE[mid] || '',
      material: sp['쉘 원단'] || sp['소재'] || '',
      isWaterproof: mid === 'rainjacket' ? true : '', // 방수 재킷 게시판만 근거 있음, 나머지는 추론하지 않음
      fillMaterial: mid === 'downjacket' ? 'down' : fill ? fillKind(fill) : '',
      hasHood: /hood|hoody|hoodie|parka/i.test(name),
    };
  }
  if (cat === 'tent') {
    const fly = sp['RAINFLY FABRIC'] || '';
    const hh = fly.match(/(\d{3,5})\s*mm/i);
    const pole = sp.POLE && !/^\d+$/.test(sp.POLE) ? sp.POLE : '';
    return {
      capacity: num(sp.CAPACITY),
      wallStructure: sp['WALL TYPE'] || '',
      shape: '',
      innerMaterial: sp['CANOPY FABRIC'] || '',
      flyMaterial: fly,
      poleMaterial: pole,
      waterproofRating: hh ? Number(hh[1]) : '',
      pitchType: sp['TENT TYPE'] || '',
      vestibuleArea: num(sp['VESTIBULE AREA']),
    };
  }
  if (cat === 'sleeping_bag') {
    return {
      shape: sp.TYPE || '',
      fillMaterial: fillKind(sp['INSULATION TYPE'] || sp.INSULATION),
      fillWeight: num(sp['FILL WEIGHT']),
      fillPower: num(sp['FILL POWER']),
      comfortTemp: '',
      limitTemp: '',
      zipperSide: '',
    };
  }
  if (cat === 'mat') {
    const t = num(sp['두께']);
    return {
      type: sp['타입'] || '',
      shape: sp['모양'] || '',
      material: sp['쉘 원단'] || sp['폼 소재'] || '',
      rValue: num(sp['R-VALUE']),
      thickness: t === '' ? '' : t < 20 ? t * 10 : t, // 사이트는 cm 표기(예: 7.6) → mm
      openSize: sp['크기'] || '',
    };
  }
  if (cat === 'backpack') {
    return {
      volume: num(sp.VOLUME),
      material: sp['MAIN FABRIC'] || '',
      frameType: '',
      backSystem: sp['BACK PANEL'] || '',
      hasHipBelt: yesNo(sp['HIP BELT']),
      hasShoulderBottlePocket: '',
      hasRainCover: yesNo(sp['RAIN COVER']),
      gender: '',
    };
  }
  if (cat === 'lighting' || cat === 'headlamp') {
    // "10,000mAh Powerbank High : 14 | Low : 30"처럼 배터리 용량이 섞여 있으면 먼저 제거
    const runtimes = nums((sp['사용 시간'] || sp['조건부  충전 가능'] || '').replace(/\d[\d,]*\s*mAh/gi, ''));
    return {
      type: /lantern|alpenglow|lighthouse|light tube|everglow/i.test(name) ? '랜턴' : /headlamp|헤드램프/i.test(name) ? '헤드램프' : '',
      maxBrightness: num(sp['최대 밝기']),
      batteryType: sp['배터리'] || '',
      waterproofRating: sp['방수'] || '',
      maxRuntime: runtimes.length ? Math.max(...runtimes) : '',
      hasRedMode: /red/i.test(`${sp['전구'] || ''} ${sp['출력 모드'] || ''}`) ? true : '',
    };
  }
  if (cat === 'trekking_pole') {
    const len = nums(sp['길이']);
    return {
      material: sp['소재'] || '',
      foldType: sp['타입'] || '',
      lockType: sp['폴 고정 방식'] || sp['길이조절 방식'] || '',
      minLength: len.length ? Math.min(...len) : '',
      maxLength: len.length ? Math.max(...len) : '',
    };
  }
  if (cat === 'bottle') {
    const c = num(sp['용량']);
    return {
      material: sp['소재'] || '',
      capacity: c === '' ? '' : c < 10 ? c * 1000 : c, // L 표기 → ml
      isInsulated: '',
      mouthType: sp['캡 타입'] || '',
    };
  }
  if (cat === 'cup') {
    const c = num(sp['용량']);
    return { material: sp['소재'] || '', capacity: c === '' ? '' : c < 10 ? c * 1000 : c, isSet: '' };
  }
  if (cat === 'cookware_etc') {
    const c = num(sp['용량']);
    return {
      material: sp['칼 소재'] || sp['쉘 원단'] || sp['소재'] || '',
      capacity: c === '' ? '' : c < 10 ? c * 1000 : c,
      isSet: '',
    };
  }
  // etc (시계·바이크팩)
  return {
    material: sp['쉘 원단'] || sp['글래스'] || sp['소재'] || '',
    size: sp['크기'] || (sp['지름'] ? `${sp['지름']}mm` : ''),
  };
};

// 사이즈별 다중값("31|37", "510|530") → [{size, weight, volume}]
const sizeVariants = (sp) => {
  const vols = String(sp.VOLUME || '').split(/\s*[|,]\s*/).filter(Boolean);
  const ws = String(sp.WEIGHT || '').split(/\s*[|,]\s*/).filter(Boolean);
  if (vols.length > 1 && vols.length === ws.length) {
    return vols.map((v, i) => ({ size: `${num(v)}L`, weight: toGrams(ws[i]), volume: num(v) }));
  }
  return null;
};

const buildRows = (card, html) => {
  const entry = NAMES[card.srl];
  const brandKey = (entry?.[2] || card.brand).toLowerCase();
  const brand = BRANDS[brandKey];
  if (!entry || !brand) {
    console.log(`[betterweekend]   ⚠ 매핑 누락 srl=${card.srl} brand="${card.brand}" name="${card.rawName}"`);
    return [];
  }
  const [name, nameKorean] = entry;
  const [company, companyKorean] = brand;
  // 카테고리 계약(2026-08-09): 헤드램프는 lighting이 아니라 headlamp(헤드랜턴). 랜턴·백팩 라이트는 lighting 유지.
  const mapped = CATEGORY_MAP[card.mid] || 'etc';
  const category = mapped === 'lighting' && /headlamp/i.test(name) ? 'headlamp' : mapped;
  const sp = parseSpecs(html);
  const detailUrl = `${BASE}/index.php?mid=gear&gear_srl=${card.srl}`;
  const base = {
    groupId: `${slugify(company)}_${slugify(name)}`,
    category,
    company,
    companyKorean,
    name,
    nameKorean,
    imageUrl: ogImage(html) || absImage(card.thumb),
    color: '',
    colorKorean: '',
    size: '',
    sizeKorean: '',
    _detailUrl: detailUrl,
    _source: `betterweekend_${category}`,
    _srl: card.srl,
    _mid: card.mid,
  };
  const specs = buildSpecs(category, card.mid, name, sp);

  // 남녀 무게가 각각 있으면 성별 두 행
  const override = WEIGHT_OVERRIDE[card.srl] || {};
  const wm = override.men || sp['무게 남성'];
  const ww = override.women || sp['무게 여성'];
  if (wm && ww) {
    return [
      { ...base, name: `${name} Men's`, nameKorean: `${nameKorean} 남성`, size: "Men's", sizeKorean: '남성', weight: toGrams(wm), specs },
      { ...base, name: `${name} Women's`, nameKorean: `${nameKorean} 여성`, size: "Women's", sizeKorean: '여성', weight: toGrams(ww), specs },
    ];
  }
  if (wm || ww) return [{ ...base, weight: toGrams(wm || ww), specs }];

  const sv = sizeVariants(sp);
  if (sv) {
    return sv.map((v) => ({
      ...base,
      name: `${name} ${v.size}`,
      nameKorean: `${nameKorean} ${v.size}`,
      size: v.size,
      sizeKorean: v.size,
      weight: v.weight,
      specs: { ...specs, volume: v.volume },
    }));
  }
  return [{ ...base, weight: override.weight ? toGrams(override.weight) : baseWeight(sp), specs }];
};

export { parseListing, parseSpecs, buildSpecs, toGrams };

export default {
  name: 'betterweekend',
  company: 'betterweekend',
  companyKorean: '베러위켄드',
  baseUrl: BASE,
  defaultCategories: [`${BASE}/gear`],
  crawl: async (_browser, { categoryUrls } = {}) => {
    const listUrl = categoryUrls?.[0] && categoryUrls[0] !== 'all' ? categoryUrls[0] : `${BASE}/gear`;
    const html = curlGet(listUrl, 'bw-gear-card');
    const cards = parseListing(html);
    console.log(`[betterweekend] 리스팅 ${cards.length}개`);
    const targets = cards.filter((c) => {
      if (EXCLUDED_BRANDS.test(c.brand.trim())) return false;
      if (EXCLUDED_SRL[c.srl]) return false;
      return true;
    });
    console.log(`[betterweekend] 기존 크롤 브랜드/기존 등록 모델 제외 후 ${targets.length}개`);
    const rows = [];
    targets.forEach((card, i) => {
      const detail = curlGet(`${BASE}/index.php?mid=gear&gear_srl=${card.srl}`, 'SPECIFICATIONS');
      if (!detail) {
        console.log(`[betterweekend]   ⚠ 상세 실패 srl=${card.srl}`);
        return;
      }
      rows.push(...buildRows(card, detail));
      if ((i + 1) % 20 === 0) console.log(`[betterweekend]   detail ${i + 1}/${targets.length}`);
      sleep(300);
    });
    return rows;
  },
};

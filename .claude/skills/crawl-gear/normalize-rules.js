// 크롤 공통 룰 정규화(2026-11). 어댑터가 만든 행에 "현재 룰"을 한곳에서 적용한다 — 룰이 바뀌면 여기만 고친다.
// 7~9월 어댑터는 10월 이후 룰을 모른 채 결과를 내므로(2026-11 리프레시 감사: 대부분 사이트 위반),
// 리프레시·신규 크롤 후 validate 전에 반드시 이 단계를 거친다. 브랜드 고유 처리(공식 영문명·OCR)는 각 어댑터 몫.
//
//  1) 제품명(name·nameKorean)에서 회사·브랜드명 제거 — 예외: 모델명 자체가 브랜드명(validate.js BRAND_IS_MODEL과 동일)
//  2) name(영문)에 남은 한글 → 로마자 음역(국내 전용 브랜드 룰, SKILL "국내 전용 브랜드 name 채우기")
//  3) 사이즈는 예외 없이 name " / size", nameKorean " sizeKorean" 끝 부착
//  4) 배낭(backpack/vest_pack)은 사이즈 옵션이 없으면 용량을 사이즈로("NL")
//  5) 숫자형 스펙은 단위 없이 숫자만(스키마 unit과 다르면 환산: oz→ml, L→ml)
//  6) 스키마에 없는 스펙 키는 같은 뜻의 키로 옮기거나 삭제(삭제 내역은 _normDropped에 남김)
//  7) color/colorKorean 한쪽만 있으면 색상 사전으로 채움(color 칸의 한글은 colorKorean으로 옮기고 영문 번역)
//
// Usage: node normalize-rules.js <in-json> [out-json]   (out 기본: 덮어쓰기)
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { SPECS_SCHEMA } from './specs-schema.js';

// ── 로마자 음역(국어의 로마자 표기법 단순화) ──
const RR_I = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const RR_M = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
const RR_F = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];
const romanizeWord = (w) => {
  let out = '';
  for (const ch of w) {
    const c = ch.codePointAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) {
      const b = c - 0xac00;
      out += RR_I[Math.floor(b / 588)] + RR_M[Math.floor((b % 588) / 28)] + RR_F[b % 28];
    } else out += ch;
  }
  return out.charAt(0).toUpperCase() + out.slice(1);
};
export const romanize = (s) => String(s || '').replace(/[가-힣]+/g, romanizeWord);

// ── 캠핑·아웃도어 외래어 사전(한글 표기 → 원어). 국내 브랜드 제품명은 대부분 영어 외래어 표기라
//    순수 로마자("Alpain Cheeo")보다 원어("Alpine Chair")가 맞다(SKILL 예: 라모나 에어썸 → Ramona Airsome). ──
const LOANWORDS = {
  체어: 'Chair', 테이블: 'Table', 텐트: 'Tent', 쉘터: 'Shelter', 타프: 'Tarp', 매트: 'Mat', 랜턴: 'Lantern', 스토브: 'Stove',
  버너: 'Burner', 토치: 'Torch', 코펠: 'Cookset', 컵: 'Cup', 머그: 'Mug', 보틀: 'Bottle', 백팩: 'Backpack', 배낭: 'Backpack',
  파우치: 'Pouch', 가방: 'Bag', 백: 'Bag', 색: 'Sack', 침낭: 'Sleeping Bag', 베개: 'Pillow', 필로우: 'Pillow', 쿠션: 'Cushion',
  자켓: 'Jacket', 재킷: 'Jacket', 팬츠: 'Pants', 바지: 'Pants', 셔츠: 'Shirt', 티셔츠: 'T-Shirt', 후디: 'Hoodie', 베스트: 'Vest',
  모자: 'Cap', 캡: 'Cap', 햇: 'Hat', 장갑: 'Gloves', 글러브: 'Gloves', 양말: 'Socks', 그라운드시트: 'Groundsheet', 풋프린트: 'Footprint',
  이너텐트: 'Inner Tent', 플라이: 'Fly', 폴: 'Pole', 팩: 'Peg', 스트링: 'String', 그릴: 'Grill', 화로대: 'Fire Pit', 화로: 'Fire Pit',
  냄비: 'Pot', 팬: 'Pan', 프라이팬: 'Frying Pan', 주전자: 'Kettle', 케틀: 'Kettle', 수저: 'Cutlery', 스푼: 'Spoon', 포크: 'Fork',
  가스: 'Gas', 캔: 'Canister', 어댑터: 'Adapter', 케이스: 'Case', 커버: 'Cover', 스킨: 'Skin', 프레임: 'Frame', 시트: 'Sheet',
  알파인: 'Alpine', 아웃백: 'Outback', 캔버스: 'Canvas', 데크: 'Deck', 와우: 'Wow', 쉐이드: 'Shade', 리코: 'Rico', 이너: 'Inner',
  옴니: 'Omni', 그라운드: 'Ground', 와이드: 'Wide', 롱: 'Long', 라지: 'Large', 미니: 'Mini', 미디움: 'Medium', 스몰: 'Small',
  울트라: 'Ultra', 라이트: 'Light', 경량: 'Lightweight', 초경량: 'Ultralight', 다운: 'Down', 구스다운: 'Goose Down', 구스: 'Goose',
  후드: 'Hood', 후드자켓: 'Hooded Jacket', 윈드쉘: 'Windshell', 레이어: 'Layer', 집업: 'Zip-Up', 반집업: 'Half Zip', 울: 'Wool',
  양말: 'Socks', 블루: 'Blue', 레드: 'Red', 블랙: 'Black', 화이트: 'White', 그레이: 'Gray', 그린: 'Green', 브라운: 'Brown',
  코코아: 'Cocoa', 오렌지: 'Orange', 옐로우: 'Yellow', 카키: 'Khaki', 베이지: 'Beige', 네이비: 'Navy', 실버: 'Silver',
  티타늄: 'Titanium', 스테인리스: 'Stainless', 알루미늄: 'Aluminum', 카본: 'Carbon', 듀오: 'Duo', 싱글: 'Single', 더블: 'Double',
  컴포트: 'Comfort', 하이킹: 'Hiking', 트레킹: 'Trekking', 캠핑: 'Camping', 레인: 'Rain', 윈드: 'Wind', 팩커블: 'Packable', 패커블: 'Packable',
  // 2026-11 코베아 신규 보강
  시그니처: 'Signature', 베스티블: 'Vestibule', 베스티뷸: 'Vestibule', 샌드: 'Sand', 에버: 'Ever', 캠프: 'Camp', 돔: 'Dome',
  베이스: 'Base', 옥타: 'Octa', 더블레이어: 'Double Layer', 가든: 'Garden', 렉타: 'Recta', 코트: 'Cot', 야전침대: 'Camp Cot',
  의자: 'Chair', 마스터: 'Master', 키친: 'Kitchen', 캐비닛: 'Cabinet', 플레이트: 'Plate', 와일드: 'Wild', 사이드: 'Side',
  확장: 'Extension', 세트: 'Set', 에어: 'Air', 고스트: 'Ghost', 팬텀: 'Phantom', 카바나: 'Cabana', 이스턴: 'Eastern',
  레인저: 'Ranger', 델타: 'Delta', 쉘터형: 'Shelter', 오토캠핑: 'Auto Camping', 자립형: 'Freestanding', 접이식: 'Folding',
  릴렉스: 'Relax', 리클라이너: 'Recliner', 플러스: 'Plus', 메쉬: 'Mesh', 윙: 'Wing', 허니콤: 'Honeycomb', 자충매트: 'Self-Inflating Mat',
  소프트쉘: 'Softshell', 하이킹: 'Hiking', 세미와이드핏: 'Semi-Wide Fit', 레귤러핏: 'Regular Fit', 백패커스: 'Backpackers', 데이하이크: 'Dayhike', 오리지널: 'Original', 로고: 'Logo', 자수: 'Embroidered', 쿨맥스: 'Coolmax', 양말: 'Socks', 글레시어: 'Glacier', 서울: 'Seoul', 긴팔티셔츠: 'Long Sleeve T-Shirt', 다이렉트: 'Direct', 레깅스: 'Leggings', 폴라텍: 'Polartec', 파워드라이: 'Power Dry', 하이로프트: 'High Loft', 넥워머: 'Neck Warmer', 바라클라바: 'Balaclava', 이어플립: 'Earflap', 버킷햇: 'Bucket Hat', '3레이어': '3-Layer', 코듀라: 'Cordura', 백팩: 'Backpack', 테나야팩: 'Tenaya Pack', 크로스백: 'Crossbody Bag', 지갑: 'Wallet', 숄더백: 'Shoulder Bag', 집색: 'Zip Sack', 라이엘: 'Lyell', 라센: 'Lassen', 퓨미스: 'Pumice', 이어머프: 'Earmuff', 넥: 'Neck', 게이터: 'Gaiter', 모스: 'Moss', 알파: 'Alpha', 후디: 'Hoodie', 코어: 'Core', 컴포트: 'Comfort', 인슐레이션: 'Insulation', 모조: 'Mojo', 싱글: 'Single', 머그: 'Mug', 포트: 'Pot', 솔로: 'Solo', 스포크: 'Spork', 써모컴패스: 'Thermocompass', 시에라: 'Sierra', 컵: 'Cup', 플렉스: 'Flex', 카파시터: 'Capacitor', 파워: 'Power', 쉴드: 'Shield', 캡: 'Cap', 풀문: 'Full Moon', 하프집: 'Half Zip', 플리스: 'Fleece', 우먼스: "Women's", 리미티드: 'Limited', 에디션: 'Edition', 넉다운: 'Knockdown', 플립플롭: 'Flip-Flop', 웨이: 'Way', 프로: 'Pro', 에어라이트: 'Airlite', 얼티밋라이트: 'Ultimatelite', 다운팬츠: 'Down Pants', 다운자켓: 'Down Jacket', 실타프: 'Siltarp', 헥사: 'Hexa', 베러: 'Better', 트레일: 'Trail', 비너스: 'Venus', 위젯: 'Widget', 펌프: 'Pump', 매트: 'Mat', 스트랩: 'Strap', 메가매트: 'MegaMat', 블랙에디션: 'Black Edition', 화이트아웃: 'Whiteout', 부티: 'Booty', 풋프린트: 'Footprint', 패커블: 'Packable', 파우치: 'Pouch', 어깨끈: 'Shoulder Strap', 백: 'Bag', 타막: 'Tarmac', 티탄: 'Titan', 케틀: 'Kettle', 믹스컬러: 'Mix Color', 믹스: 'Mix', 컬러: 'Color', 그라운드: 'Ground', 모리스: 'Morris', 보리스: 'Boris', 에버닌: 'Evernin', 제리: 'Jerry',
};
const LOAN_KEYS = Object.keys(LOANWORDS).sort((a, b) => b.length - a.length);
// 한글 이름 → 영문: ① "넥서스(NEXUS)" 괄호 원어 우선 ② 외래어 사전 ③ 남은 한글은 로마자(행에 _normRomanized 표시)
export const koNameToEn = (s) => {
  let t = String(s || '').replace(/[가-힣][가-힣\s]*\(([A-Za-z][A-Za-z0-9 .'&-]*)\)/g, (m, en) => en.toUpperCase() === en ? en.replace(/\b([A-Z])([A-Z]+)\b/g, (w, a, b) => a + b.toLowerCase()) : en);
  t = t.replace(/(\d+)\s*인용/g, '$1P');
  t = t.replace(/[가-힣]+/g, (w) => {
    if (LOANWORDS[w]) return LOANWORDS[w];
    // 붙여 쓴 복합어("아웃백옴니이너그라운드시트")는 긴 외래어부터 앞에서 잘라 맞춘다
    let rest = w;
    const parts = [];
    while (rest) {
      const k = LOAN_KEYS.find((x) => rest.startsWith(x));
      if (!k) return w; // 다 못 맞추면 원문 → 아래에서 로마자
      parts.push(LOANWORDS[k]);
      rest = rest.slice(k.length);
    }
    return parts.join(' ');
  });
  return t.replace(/\s{2,}/g, ' ').replace(/(\d)(Way|Layer)\b/g, '$1-$2').trim();
};

// ── 색상 사전(공통) [한글, 영문] — 짝 채우기용 ──
const COLOR_PAIRS = [
  ['블랙', 'Black'], ['화이트', 'White'], ['그레이', 'Gray'], ['그레이', 'Grey'], ['네이비', 'Navy'], ['레드', 'Red'], ['블루', 'Blue'],
  ['그린', 'Green'], ['옐로우', 'Yellow'], ['옐로', 'Yellow'], ['오렌지', 'Orange'], ['브라운', 'Brown'], ['베이지', 'Beige'],
  ['카키', 'Khaki'], ['올리브', 'Olive'], ['샌드', 'Sand'], ['실버', 'Silver'], ['골드', 'Gold'], ['핑크', 'Pink'], ['퍼플', 'Purple'],
  ['민트', 'Mint'], ['아이보리', 'Ivory'], ['차콜', 'Charcoal'], ['코요테', 'Coyote'], ['탄', 'Tan'], ['카모', 'Camo'], ['크림', 'Cream'],
  ['라이트', 'Light'], ['다크', 'Dark'], ['딥', 'Deep'], ['스카이', 'Sky'], ['포레스트', 'Forest'], ['와인', 'Wine'], ['버건디', 'Burgundy'],
  ['멜란지', 'Melange'], ['티타늄', 'Titanium'], ['내추럴', 'Natural'], ['라임', 'Lime'], ['틸', 'Teal'], ['코랄', 'Coral'],
  ['믹스', 'Mix'], ['템페스트', 'Tempest'], ['아미', 'Army'], ['앤트러사이트', 'Anthracite'], ['폴른', 'Pollen'], ['에보니', 'Ebony'], ['페블', 'Pebble'], ['피그', 'Fig'], ['그레이프프루트', 'Grapefruit'], ['투스칸', 'Tuscan'], ['블루버드', 'Bluebird'], ['플럼', 'Plum'], ['진저', 'Ginger'], ['그레이프', 'Grape'], ['오크', 'Oak'], ['오트밀', 'Oatmeal'], ['슬레이트', 'Slate'], ['아이스', 'Ice'], ['아게이트', 'Agate'], ['버치', 'Birch'], ['매직', 'Magic'], ['매머드', 'Mommoth'], ['솔트그레이', 'Salt Grey'], ['솔트', 'Salt'], ['애쉬', 'Ash'], ['멀티', 'Multi'], ['투명', 'Clear'], ['청록', 'Teal'], ['검정', 'Black'], ['흰색', 'White'], ['회색', 'Gray'], ['빨강', 'Red'],
  ['파랑', 'Blue'], ['초록', 'Green'], ['노랑', 'Yellow'], ['주황', 'Orange'], ['갈색', 'Brown'], ['남색', 'Navy'], ['분홍', 'Pink'],
  // 2026-11 코오롱 신상 색상
  ['멜란', 'Melange'], ['미디엄', 'Medium'], ['모스', 'Moss'], ['그레이지', 'Greige'], ['카멜', 'Camel'], ['그레이시', 'Grayish'],
  ['오션', 'Ocean'], ['신더', 'Cinder'], ['페일', 'Pale'], ['애플', 'Apple'], ['로열', 'Royal'], ['로얄', 'Royal'], ['스틸', 'Steel'],
  ['머스타드', 'Mustard'], ['브릭', 'Brick'], ['레이크', 'Lake'], ['바이올렛', 'Violet'], ['웜', 'Warm'], ['머드', 'Mud'],
  ['라벤더', 'Lavender'], ['아쿠아', 'Aqua'], ['오프', 'Off'], ['세이지', 'Sage'], ['토프', 'Taupe'], ['스톤', 'Stone'], ['러셋', 'Russet'],
  ['살몬', 'Salmon'],
];
const KO2EN = new Map(COLOR_PAIRS.map(([k, e]) => [k, e]));
const EN2KO = new Map();
for (const [k, e] of COLOR_PAIRS) if (!EN2KO.has(e.toLowerCase())) EN2KO.set(e.toLowerCase(), k);
export const colorKoToEn = (s) => String(s).split(/(\s+|\/|&|,)/).map((t) => (KO2EN.get(t.trim()) ?? (/[가-힣]/.test(t) ? romanizeWord(t.trim()) : t))).join('').replace(/\s+/g, ' ').trim();
const colorEnToKo = (s) => {
  const parts = String(s).split(/(\s+|\/|&|,)/);
  const out = parts.map((t) => (/^[A-Za-z]+$/.test(t) ? EN2KO.get(t.toLowerCase()) ?? null : t));
  return out.some((t) => t === null) ? '' : out.join('').replace(/\s+/g, ' ').trim(); // 모르는 단어가 있으면 채우지 않음(validate가 잡게)
};

// ── 브랜드명 제거 ──
const BRAND_IS_MODEL = { samaya: /^(samaya|사마야)\s*\d/i };
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const stripBrand = (text, tokens) => {
  let t = String(text || '');
  for (const b of tokens) {
    if (!b || b.length < 2) continue;
    const re = new RegExp(`(^|[\\s(\\[])${escapeRe(b)}(?=$|[\\s)\\]/,:-])`, 'gi');
    t = t.replace(re, '$1');
  }
  return t.replace(/\(\s*\)|\[\s*\]/g, '').replace(/^[\s\-–:/|]+/, '').replace(/\s{2,}/g, ' ').trim();
};

// ── 숫자 스펙 ──
const toNumberSpec = (v, unit) => {
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return s;
  const m = s.replace(/,/g, '').match(/(-?\d+(?:\.\d+)?)\s*(ml|mL|l|L|oz|kg|g|mm|cm|m|인|p|P|°C|℃|lm|hr|h|시간|m²|㎡)?/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  const u = (m[2] || '').toLowerCase();
  const want = String(unit || '').toLowerCase();
  if (want === 'ml' && u === 'l') n *= 1000;
  else if (want === 'ml' && u === 'oz') n = Math.round(n * 29.5735);
  else if (want === 'l' && u === 'ml') n /= 1000;
  else if (want === 'kg' && u === 'g') n /= 1000;
  else if (want === 'mm' && u === 'cm') n *= 10;
  else if (want === 'cm' && u === 'mm') n /= 10;
  return String(Math.round(n * 1000) / 1000);
};
// 스키마에 없는 키 → 같은 뜻의 키
const KEY_REMAP = {
  tent: { material: 'flyMaterial' },
  tarp: { material: 'flyMaterial', innerMaterial: 'flyMaterial' },
  shelter: { material: 'flyMaterial' },
  table: { material: 'topMaterial' },
  pillow: { fillMaterial: 'material' },
  tent_acc: { flyMaterial: 'material' },
  chair: { flyMaterial: 'material' },
  clothing: { flyMaterial: 'material' },
  hip_pack: {},
};

// 국내몰 상품명 끝의 검색용 설명(캠핑의자·캠핑야전침대·캠핑타프 등) — 모델명이 아님
const SEO_TAIL = /\s*(?:초?경량\s*)?캠핑\s*(?:의자|야전침대|타프|테이블)(?:\s*접이식)?$/;
const ENT = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ', '&#8361;': '₩' };
const decodeEnt = (v) => (typeof v === 'string' ? v.replace(/&(?:amp|quot|#39|lt|gt|nbsp|#8361);/g, (m) => ENT[m]) : v);
export const normalizeRow = (r) => {
  const out = { ...r, specs: { ...(r.specs || {}) } };
  // 0) HTML 엔티티 잔존 제거("모리스&amp;보리스")
  for (const f of ['name', 'nameKorean', 'color', 'colorKorean', 'size', 'sizeKorean']) out[f] = decodeEnt(out[f] ?? '');
  if (!out._detailUrl && /product_no=|branduid=|\/product\/[^/]+\/\d+/.test(out._source || '')) out._detailUrl = out._source;
  const dropped = [];
  // 1) 브랜드명 제거
  const bm = BRAND_IS_MODEL[out.company];
  const modelOk = bm && bm.test(out.name || '') && bm.test(out.nameKorean || '');
  if (!modelOk) {
    const tokens = [out.company, out.companyKorean, ...(r._brandAliases || [])].filter(Boolean).sort((a, b) => b.length - a.length);
    out.name = stripBrand(out.name, tokens) || out.name;
    out.nameKorean = stripBrand(out.nameKorean, tokens) || out.nameKorean;
  }
  // 1.5) 국내몰 이름의 색상·검색용 꼬리말 제거 — 색상은 color 필드로("미니마스터체어4 경량캠핑의자 옐로우" → "미니마스터체어4")
  const isColorKo = (t) => t.split('/').every((w) => KO2EN.has(w));
  let mk = String(out.nameKorean || '').match(/^(.*?)\s*[([]?([가-힣]+(?:\/[가-힣]+)*)[)\]]?$/);
  if (mk && mk[1] && isColorKo(mk[2])) {
    if (!out.colorKorean) out.colorKorean = mk[2];
    if (out.colorKorean === mk[2]) out.nameKorean = mk[1].trim();
  }
  out.nameKorean = String(out.nameKorean || '').replace(SEO_TAIL, '').trim();
  if (out.colorKorean && out.name) {
    const ce = colorKoToEn(out.colorKorean);
    out.name = out.name.replace(new RegExp(`\\s*[([]?${escapeRe(ce)}[)\\]]?$`, 'i'), '').trim();
  }
  // 2) name(영문)의 한글 → 괄호 원어·외래어 사전 → 남은 건 로마자(해외 브랜드는 실제 영문명이 맞으니 행별 검토에서 확인)
  //    name이 비어 있으면(코베아처럼 한글명만 주는 국내 브랜드) nameKorean에서 만든다 — 끝의 사이즈는 아래 3)에서 다시 붙인다
  if (!String(out.name || '').trim() && out.nameKorean) {
    out.name = out.sizeKorean && out.nameKorean.endsWith(` ${out.sizeKorean}`) ? out.nameKorean.slice(0, -out.sizeKorean.length - 1) : out.nameKorean;
  }
  if (/[가-힣]/.test(out.name)) {
    out.name = koNameToEn(out.name);
    if (/[가-힣]/.test(out.name)) {
      out.name = romanize(out.name).replace(/\s{2,}/g, ' ').trim();
      out._normRomanized = true;
    }
  }
  if (/[가-힣]/.test(out.size)) out.size = romanize(out.size);
  // 한글명의 괄호 영문 원어 제거("로사(ROSA) 소프트쉘 자켓" → "로사 소프트쉘 자켓") — 영문명은 위에서 이미 원어로 만들었다
  if (/[가-힣]\([A-Z][A-Z0-9 .&'-]*\)/.test(out.nameKorean)) out.nameKorean = out.nameKorean.replace(/([가-힣])\([A-Z][A-Z0-9 .&'-]*\)/g, '$1');
  // 7) 색상 짝
  if (/[가-힣]/.test(out.color)) {
    if (!out.colorKorean) out.colorKorean = out.color;
    out.color = colorKoToEn(out.color);
  }
  if (out.color && !out.colorKorean) out.colorKorean = colorEnToKo(out.color);
  if (!out.color && out.colorKorean) out.color = colorKoToEn(out.colorKorean);
  // 4) 배낭 용량=사이즈
  if (['backpack', 'vest_pack'].includes(out.category) && !out.size && out.specs.volume) {
    out.size = `${String(out.specs.volume).replace(/\s*L$/i, '')}L`;
    out.sizeKorean = out.size;
  }
  if (out.size && !out.sizeKorean) out.sizeKorean = out.size;
  // 3) 사이즈 이름 끝 부착(예외 없음)
  // "… S / S"처럼 사이즈가 두 번 붙은 이름 정리
  if (out.size) out.name = out.name.replace(new RegExp(`\\s+${escapeRe(out.size)}( / ${escapeRe(out.size)})$`), '$1');
  // 사이트 이름에 사이즈가 이미 맨 끝에 붙어 있으면("렉타가든 M") 떼고 규칙 형식으로 다시 붙인다
  if (out.size && !out.name.endsWith(` / ${out.size}`)) out.name = `${out.name.replace(new RegExp(`\\s+${escapeRe(out.size)}$`), '')} / ${out.size}`;
  if (out.size && out.sizeKorean && out.sizeKorean !== out.size && !out.nameKorean.endsWith(` ${out.sizeKorean}`)) out.nameKorean = out.nameKorean.replace(new RegExp(`\\s+${escapeRe(out.size)}$`), '');
  if (out.sizeKorean && !out.nameKorean.endsWith(` ${out.sizeKorean}`)) out.nameKorean = `${out.nameKorean} ${out.sizeKorean}`;
  // 5)·6) 스펙
  const schema = SPECS_SCHEMA[out.category] || {};
  for (const [k, v] of Object.entries(out.specs)) {
    let key = k;
    if (!schema[key]) {
      const to = KEY_REMAP[out.category]?.[key];
      delete out.specs[k];
      if (to && schema[to] && (out.specs[to] === undefined || out.specs[to] === '')) key = to;
      else {
        dropped.push(`${k}=${v}`);
        continue;
      }
    }
    let val = v;
    if (schema[key].type === 'number' && val !== '' && val !== null && val !== undefined) {
      const n = toNumberSpec(val, schema[key].unit);
      if (n === null) {
        dropped.push(`${key}=${v}`);
        continue;
      }
      val = n;
    }
    out.specs[key] = val;
  }
  if (dropped.length) out._normDropped = dropped;
  return out;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [src, dst] = process.argv.slice(2);
  if (!src) {
    console.error('Usage: node normalize-rules.js <in-json> [out-json]');
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(src, 'utf-8'));
  const rows = Array.isArray(data) ? data : data.items || data.gears;
  const out = rows.map(normalizeRow);
  const changed = out.filter((r, i) => JSON.stringify(r) !== JSON.stringify(rows[i])).length;
  writeFileSync(dst || src, JSON.stringify(Array.isArray(data) ? out : { ...data, items: out }, null, 2));
  const dropped = out.filter((r) => r._normDropped).length;
  console.log(`[normalize-rules] ${rows.length}행 중 ${changed}행 정규화, 스펙 삭제 ${dropped}행 → ${dst || src}`);
}

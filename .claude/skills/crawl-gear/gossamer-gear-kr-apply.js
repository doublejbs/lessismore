// 고싸머기어 크롤(영문)에 한글명/색상/사이즈를 채운다. SKILL.md "한글화" 룰:
//  - KR 공식 스토어(gossamergear.co.kr)의 공식 모델 표기(마리포사/고릴라/그리트/스칼라/시마/피쿠/
//    사이드퀘스트/더투/더프리 등)를 사전 기반으로 음역. KR 스토어 명이 마케팅 문구로 지저분해
//    verbatim 사용이 곤란 → 공식 용어를 사전화해 일관 음역(음역 결과가 KR 스토어 표기와 일치).
//  - 서드파티 콜라보 브랜드(Toaks/Nitecore/Suunto/Cumulus 등)·소재/모델코드(DCF/TPU/DAC/PVT/
//    UHMWPE/G4-20/FT3/LT5/GVP)·규격(인치/mm/버클)은 그대로 둔다.
// 사용: node gossamer-gear-kr-apply.js [crawl-json]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const crawlPath = process.argv[2] || join(__dirname, 'out', 'gossamer-gear-full.json');

// ── 단어 사전(모델명 + 공통어). KR 스토어 공식 표기 우선. ──
const WORD = {
  // 모델명(GG 자체)
  mariposa: '마리포사', gorilla: '고릴라', kumo: '쿠모', murmur: '머머', vagabond: '배가본드',
  bumster: '범스터', loris: '로리스', vetta: '베타', minimalist: '미니멀리스트', elixir: '엘릭서',
  mirage: '미라지', piku: '피쿠', sidequest: '사이드퀘스트', grit: '그리트', skala: '스칼라', cima: '시마',
  fastpack: '패스트팩', vanish: '배니시', whisper: '위스퍼', riksak: '릭색', oasis: '오아시스', reef: '리프',
  fastbelt: '패스트벨트', 'g4-20': 'G4-20', tiki: '티키', kula: '쿨라', oddittys: '오디티스', oasis2: '오아시스',
  // 시리즈/라인
  the: '더', one: '원', two: '투', free: '프리', type: 'TYPE', ii: 'II', classic: '클래식', alchemy: '알케미',
  clearskies: '클리어스카이', clear: '클리어', skies: '스카이',
  // 공통 명사
  backpack: '백팩', daypack: '데이팩', pack: '팩', sling: '슬링', duffel: '더플', bag: '백', rucksack: '럭색',
  ultralight: '울트라라이트', hyperlight: '하이퍼라이트', lightweight: '경량', superlight: '초경량', light: '라이트',
  foam: '폼', pad: '패드', pads: '패드', sitlight: '싯라이트', thinlight: '씬라이트', donut: '도넛', torso: '토르소',
  pole: '폴', poles: '폴', trekking: '트레킹', hiking: '하이킹', stick: '스틱', carbon: '카본',
  umbrella: '엄브렐러', lightrek: '라이트렉', chrome: '크롬', tldm: 'TLDM', folding: '폴딩', travel: '트래블',
  tent: '텐트', tarp: '타프', shelter: '쉘터', footprint: '풋프린트', stake: '스테이크', stakes: '스테이크',
  cube: '큐브', cubes: '큐브', pocket: '포켓', pockets: '포켓', pouch: '파우치', sack: '색', sacks: '색',
  liner: '라이너', liners: '라이너', cover: '커버', ditty: '디티', wallet: '월렛', organizer: '오거나이저',
  strap: '스트랩', straps: '스트랩', hipbelt: '힙벨트', sternum: '스터넘', slider: '슬라이더', shoulder: '숄더',
  belt: '벨트', buckle: '버클', buckles: '버클', webbing: '웨빙', cord: '코드', compression: '컴프레션',
  bottle: '보틀', water: '워터', filter: '필터', squeeze: '스퀴즈', hydration: '하이드레이션', carry: '캐리',
  pot: '팟', stove: '스토브', spork: '스포크', spoon: '스푼', knife: '나이프', bowl: '보울', bamboo: '뱀부',
  feedbag: '피드백', potpocket: '팟포켓', snack: '스낵', canister: '캐니스터', bear: '베어', storage: '스토리지',
  titanium: '티타늄', mini: '미니', micro: '마이크로', compact: '컴팩트', solo: '솔로', long: '롱', handle: '핸들',
  towel: '타월', jacket: '자켓', hats: '햇', hat: '햇', beanies: '비니', beanie: '비니', boxer: '복서', tee: '티',
  't-shirts': '티셔츠', shoe: '슈', bug: '버그', net: '넷', head: '헤드', invisinet: '인비지넷',
  bundle: '번들', kit: '키트', set: '세트', sets: '세트', starter: '스타터', upgrade: '업그레이드', replacement: '교체용',
  repair: '수리', patches: '패치', tape: '테이프', sealant: '실런트', grip: '그립', seam: '심', tenacious: '테네이셔스',
  keychain: '키체인', flashlight: '플래시라이트', headlamp: '헤드램프', rechargeable: '충전식', lumen: '루멘',
  clamp: '클램프', handsfree: '핸즈프리', gear: '기어', shock: '쇼크', adjustable: '조절식', attachment: '어테치먼트',
  bungee: '번지', collar: '칼라', passporter: '패스포터', 'dirty': '더티', clean: '클린', aero: '에어로', aerial: '에어리얼',
  balm: '밤', lip: '립', salve: '살브', safe: '세이프', dollar: '달러', medical: '메디컬', hygiene: '하이진',
  sun: '선', waterproof: '방수', polycryo: '폴리크라이오', rocket: '로켓', static: '스태틱', baskets: '바스켓',
  tips: '팁', rubber: '러버', boots: '부츠', crotch: '크로치', peg: '펙', 'v-shaped': 'V자', twinn: '트윈', piece: '피스',
  three: '3', pair: '페어', sections: '섹션', section: '섹션', top: '탑', shelf: '쉘프', discontinued: '단종',
  previous: '이전', model: '모델', 'long-handle': '롱핸들', polished: '폴리시드', standard: '스탠다드', dc: 'DC',
  jet: '제트', backpacking: '백패킹', packing: '패킹', zipper: '지퍼', cleaner: '클리너', lube: '루브',
  sticker: '스티커', sheet: '시트', cloth: '클로스', passporter: '패스포터', reef: '리프', oasis: '오아시스',
  blackbelt: '블랙벨트', fast: '패스트', aero: '에어로', invisinet: '인비지넷', smart: '스마트', silicone: '실리콘',
  adhesive: '접착', sil: 'SIL', wp: 'WP', flow: '플로우', air: '에어', keychain2: '키체인', summer: '서머',
  your: '유어', do: 'do', less: 'less', more: 'more',
  // 이름 속 색상/사이즈 단어(타이틀에 "- Yellow", "- Large"로 포함됨)
  yellow: '옐로우', red: '레드', green: '그린', blue: '블루', black: '블랙', grey: '그레이', gray: '그레이',
  orange: '오렌지', gold: '골드', badlands: '배드랜즈', glacier: '글레이셔', tropical: '트로피컬', mist: '미스트',
  sherbet: '셔벗', acai: '아사이', dark: '다크', small: '스몰', medium: '미디엄', large: '라지', regular: '레귤러',
  // 누락 보강
  little: '리틀', stretch: '스트레치', trowel: '트로웰', sit: '싯', carabiners: '카라비너', carabiner: '카라비너',
  sleeping: '슬리핑', bare: '베어', hiker: '하이커', "hiker's": '하이커스', gossamer: '고싸머', ben: '벤',
  "ben's": '벤스', with: '', x: 'x', 'sit-light': '싯라이트', and: '', compass: '컴퍼스', canister: '캐니스터',
  boxer: '복서', pair: '페어', clipper: '클리퍼',
};
// 색상 EN→KO
const COLOR = {
  badlands: '배드랜즈', glacier: '글레이셔', yellow: '옐로우', red: '레드', orange: '오렌지', 'light blue': '라이트 블루',
  black: '블랙', 'dark blue': '다크 블루', green: '그린', chrome: '크롬', gold: '골드', 'tropical mist': '트로피컬 미스트',
  grey: '그레이', gray: '그레이', 'titanium grey': '티타늄 그레이', blue: '블루', sherbet: '셔벗', acai: '아사이',
};
// 그대로 두는 토큰(브랜드/모델코드/규격/사이즈코드)
// 그대로 두는 것: 소재/모델코드 + 서드파티 콜라보 브랜드(고싸머기어 자체 모델명은 위 WORD로 음역).
const KEEP = /^(?:DCF|TPU|DAC|PVT|UHMWPE|FT3|LT5|GVP|NU20|USB-C|G4-20|II|III|Toaks|TOAKS|Nitecore|Suunto|Cumulus|Evernew|Aerial|Kula|Clipper|Joshua|Tree|Tyvek|Hikerkind|Glen|Van|Peski|PFID|J-Stakes)$/i;
const isKeep = (t) => KEEP.test(t) || /^[0-9]/.test(t) || /^[0-9.]+(?:l|ml|mm|oz|g|cm|"|in)?$/i.test(t) || /^[SMLX/]+$/.test(t) || /^\d+\/\d+/.test(t);

const translitToken = (t) => {
  const bare = t.replace(/[().,]/g, ''); // 괄호도 제거해 "(2 Pack)"·"(Discontinued)"도 매칭
  if (!bare) return t;
  if (isKeep(bare)) return bare;
  return WORD[bare.toLowerCase()] ?? t; // 미상 → 원문(브랜드/모델명)
};
const transliterateName = (name) =>
  ('고싸머기어 ' +
    name
      .split(/(\s+|\/)/)
      .map((seg) => (/^\s+$/.test(seg) || seg === '/' ? seg : seg.split(/\s+/).map(translitToken).join(' ')))
      .join(''))
    .replace(/\s+/g, ' ')
    .trim();

const colorToKorean = (c) => {
  const key = (c || '').trim().toLowerCase();
  if (!key) return '';
  if (COLOR[key]) return COLOR[key];
  return key.split(/\s+/).map((w) => COLOR[w] ?? w).join(' '); // 부분 매핑
};
const sizeToKorean = (s) => {
  const v = (s || '').trim();
  if (!v) return '';
  const map = { small: '스몰', medium: '미디엄', large: '라지', regular: '레귤러', full: '풀', half: '하프' };
  // "Small - 17"" → "스몰 - 17"", 규격(인치/mm/버클)은 그대로
  return v
    .split(/(\s+|[-/])/)
    .map((seg) => (/^\s+$/.test(seg) || /[-/]/.test(seg) ? seg : map[seg.toLowerCase()] ?? seg))
    .join('');
};

const rows = JSON.parse(readFileSync(crawlPath, 'utf-8'));
let n = 0;
for (const r of rows) {
  r.nameKorean = transliterateName(r.name);
  if (r.color) r.colorKorean = colorToKorean(r.color);
  if (r.size) r.sizeKorean = sizeToKorean(r.size);
  n++;
}
writeFileSync(crawlPath, JSON.stringify(rows, null, 1), 'utf-8');
console.log(`한글화 적용: ${n}행 -> ${crawlPath}`);

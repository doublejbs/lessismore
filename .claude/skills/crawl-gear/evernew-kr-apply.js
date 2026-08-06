// 에버뉴 글로벌(영문) 크롤 결과에 한글명(nameKorean)을 채운다. SKILL.md "한글화" 룰:
//   1) 한국 유통사(홀레인·아웃도어뱅크) {제품코드→한글명} 레퍼런스로 verbatim 매칭
//   2) 못 찾은 것은 KR 사이트 용어에 맞춘 단어 음역으로 생성
// 레퍼런스는 out/evernew-kr-ref.json (코드→한글명). 사용: node evernew-kr-apply.js <crawl-json> [ref-json]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const crawlPath = process.argv[2] || join(__dirname, 'out', 'evernew-full.json');
// 레퍼런스({코드→한글명})는 스킬 디렉터리에 커밋(out/은 gitignore). 갱신은 홀레인/아웃도어뱅크 재수집.
const refPath = process.argv[3] || join(__dirname, 'evernew-kr-ref.json');

// ── 영문→한글 단어 사전 (KR 유통사 표기에 정렬: pot→포트, cup→컵, alu→알루, lid→뚜껑 등) ──
const WORD = {
  ti: '티타늄', titanium: '티타늄', alu: '알루', alumi: '알루', almi: '알루', 'alu.': '알루', alr: '알루',
  pot: '포트', pan: '팬', cup: '컵', mug: '머그', bowl: '보울', plate: '플레이트', dish: '디쉬', multidish: '멀티디쉬',
  cooker: '쿠커', kettle: '케틀', frypan: '프라이팬', 'frying': '프라이', alumifrypan: '알루프라이팬', hango: '한고',
  lid: '뚜껑', handle: '핸들', hook: '훅', chain: '체인', trivet: '트리벳', clip: '클립',
  bag: '백', case: '케이스', mesh: '메시', sack: '색', pouch: '파우치', cover: '커버',
  wide: '와이드', deep: '딥', flat: '플랫', round: '라운드', square: '스퀘어', compact: '컴팩트', folding: '폴딩',
  full: '풀', single: '싱글', double: '더블', flip: '플립', slim: '슬림',
  spork: '스포크', spoon: '스푼', fork: '포크', spatula: '뒤집개', heratura: '헤라투라', sputura: '스푸투라',
  kogatana: '코가타나', knife: '나이프', chopstick: '젓가락',
  apex: '에이펙스', zarazara: '자라자라', tibitibi: '티비티비', tibi: '티비', maccheroni: '마케로니',
  demitasse: '데미타세', miyama: '미야마', sake: '사케', pantapas: '판타파스', sangaku: '산가쿠', sawo: '사워',
  mayu: '마유', gubi: '구비', gubigubi: '구비구비', nabetsucam: '나베츠캠', meshitsucam: '메시츠캠', 'meshitsucam': '메시츠캠',
  cuisine: '퀴진', backcountry: '백컨트리', okudake: '오쿠다케', shaodow: '섀도우', shadow: '섀도우',
  stove: '스토브', stand: '스탠드', power: '파워', torch: '토치', windshield: '윈드쉴드', cross: '크로스',
  mat: '매트', pillow: '필로우', pad: '패드',
  red: '레드', grey: '그레이', gray: '그레이', orange: '오렌지', shine: '샤인', marble: '마블', fire: '파이어',
  storagebottle: '스토리지보틀', bottle: '보틀', flask: '플라스크', canteen: '캔틴', mouth: '마우스', 'water': '워터', carry: '캐리',
  hydration: '하이드레이션', tube: '튜브', hip: '힙', umbrella: '엄브렐라', airy: '에어리', trail: '트레일',
  tenugui: '테누구이', evernewtenugui: '에버뉴 테누구이', sticker: '스티커', evernew: '에버뉴', cane: '케인',
  clamp: '클램프', clmp: '클램프', clmp2: '클램프', strap: '스트랩', tape: '테이프', ring: '링', cap: '캡', tip: '팁',
  carbon: '카본', stick: '스틱', johnnie: '조니', hiker: '하이커', cleaner: '클리너', master: '마스터',
  brush: '브러쉬', egg: '에그', trivet2: '트리벳', set: '세트', mister: '미스터', neoprene: '네오프렌',
  cutting: '커팅', board: '보드', coffee: '커피', dripper: '드리퍼', soup: '스프', packing: '패킹', fast: '패스트',
  the: '', and: '', for: '', shade: '셰이드', snow: '스노우', aquajacket: '아쿠아재킷', aqua: '아쿠아', jacket: '재킷',
  'x-pac': 'X-Pac', xpac: 'X-Pac', 'two-pack': '투팩', two: '투', pack: '팩', 'pre-heating': '예열',
  'n-stick': '논스틱', 'n-stick2': '논스틱', preheating: '예열', pre: '프리', heating: '히팅', two2: '투',
  osmo: '오스모', mm: 'mm', 'tip-os': '팁 OS', deco: '데코', boko: '보코', dekoboko: '데코보코',
};
// 그대로 두는 토큰(모델 접미·규격·사이즈·코드): UL, U.L., FH, FD, NH, DX, HD., B.C., SC, LL, B5, T0.2, S/M/L, 숫자 등
const KEEP = /^(?:U\.?L\.?|FH|FD|NH|DX|HD\.?|B\.?C\.?|SC|LL|FC|DG|B\d|T\d|R|S|M|L|H|LX|ML|Ti)$/i;
const isNum = (t) => /^[0-9]+(?:\.[0-9]+)?(?:cm|mm|ml|l|g|kg|°?)?$|^\d+fh$|^\d+fd$|^\d+l$/i.test(t);

const translitToken = (t) => {
  const bare = t.replace(/[().,]/g, '');
  if (!bare) return t;
  if (isNum(bare)) return t;
  if (KEEP.test(bare)) return bare.toUpperCase() === 'TI' ? '티타늄' : bare;
  const w = WORD[bare.toLowerCase()];
  if (w !== undefined) return w;
  // 붙은 숫자 분리(실측: "Aquajacket333ml" → aquajacket + 333ml)
  const am = bare.match(/^([A-Za-z]+)(\d.*)$/);
  if (am && WORD[am[1].toLowerCase()] !== undefined) return WORD[am[1].toLowerCase()] + am[2];
  return t; // 미상 → 원문 유지
};
const transliterate = (name) =>
  name
    .split(/(\s+|\/)/)
    .map((seg) => (/^\s+$/.test(seg) || seg === '/' ? seg : seg.split(/\s+/).map(translitToken).join(' ')))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

// 수동 음역(글로벌 사이트가 영문이 아닌 일본 한자명으로 노출하는 등 특수 케이스).
const MANUAL = {
  EBY636: '산가쿠 한고 2형', // 글로벌 사이트 표기 "山岳飯盒弐型"(일본 한자) → 음역
};

const rows = JSON.parse(readFileSync(crawlPath, 'utf-8'));
const ref = JSON.parse(readFileSync(refPath, 'utf-8'));
let verbatim = 0;
let translit = 0;
for (const r of rows) {
  if (ref[r._code]) {
    r.nameKorean = ref[r._code];
    r._koSource = 'verbatim';
    verbatim++;
  } else if (MANUAL[r._code]) {
    r.nameKorean = MANUAL[r._code];
    r._koSource = 'manual';
    translit++;
  } else {
    r.nameKorean = transliterate(r.name);
    r._koSource = 'translit';
    translit++;
  }
}
writeFileSync(crawlPath, JSON.stringify(rows, null, 1), 'utf-8');
console.log(`nameKorean 채움: verbatim ${verbatim}, 음역 ${translit} / ${rows.length}행 -> ${crawlPath}`);

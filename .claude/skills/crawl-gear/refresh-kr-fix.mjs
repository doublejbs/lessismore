// 4단계 신규 행 후처리(2026-11-22): 한글 필드의 영문 음역 · 사이즈 정리 · 카테고리 오분류
//   - thegearshop: colorKorean 영문(BRACKEN 등) → 한글 음역, 사이즈 Free/ALL → 없음, 옵션값이 제품명인 사이즈(스카르파 부츠) → 없음
//   - snowpeak: 영문뿐인 nameKorean → 한글 음역, THERMO/EDITION/KASURI 등 섞인 영문 단어 음역
//   - kolon-sport: colorKorean 'russet 레드' → '러셋 레드'
//   - kolon-sport: color 로마자 음역 → 영문 색상
// Usage: node s4-fix.mjs <in.json> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { colorKoToEn } from './normalize-rules.js';
const [src, dst] = process.argv.slice(2);
const rows = JSON.parse(readFileSync(src, 'utf-8'));
const W = {
  // 색상(아크테릭스·코토팍시·스카르파 등)
  '24k': '24K', acai: '아사이', aloe: '알로에', alpine: '알파인', anthracite: '안트라사이트', aqua: '아쿠아', aquaculture: '아쿠아컬처',
  arc: '아크', arctic: '아틱', ardoise: '아르두아즈', atmos: '아트모스', azure: '애저', black: '블랙', blk: '블랙', block: '블록', blue: '블루',
  blurple: '블러플', bone: '본', bracken: '브라켄', bright: '브라이트', brown: '브라운', brush: '브러시', cabin: '캐빈', canvas: '캔버스',
  carbon: '카본', caribou: '카리부', carob: '캐럽', ceramic: '세라믹', chalk: '초크', chamonix: '샤모니', charcoal: '차콜', chimayo: '치마요',
  chloris: '클로리스', chocolate: '초콜릿', cinder: '신더', citron: '시트론', clear: '클리어', cloud: '클라우드', clouds: '클라우즈',
  conifer: '코니퍼', coral: '코랄', cotopaxi: '코토팍시', cream: '크림', crimson: '크림슨', dark: '다크', deep: '딥', del: '델', dia: '디아',
  dk: '다크', dune: '듄', dust: '더스트', dynasty: '다이너스티', everglade: '에버글레이드', fatigue: '퍼티그', fire: '파이어', fjord: '피오르',
  forage: '포리지', frosted: '프로스티드', frosty: '프로스티', ghost: '고스트', gold: '골드', graphite: '그래파이트', gray: '그레이', grey: '그레이',
  green: '그린', habitat: '해비타트', heather: '헤더', hthr: '헤더', honeycomb: '허니콤', horizonacid: '호라이즌애시드', indigo: '인디고',
  iris: '아이리스', iron: '아이언', jade: '제이드', janium: '재니엄', juniper: '주니퍼', kasumi: '카스미', khaki: '카키', larch: '라치',
  lavender: '라벤더', light: '라이트', lt: '라이트', lime: '라임', log: '로그', malachite: '말라카이트', mallow: '멜로우', mantis: '맨티스',
  maritime: '머리타임', matte: '매트', metalic: '메탈릭', military: '밀리터리', mineral: '미네랄', mongoose: '몽구스', moonbeam: '문빔',
  moss: '모스', multi: '멀티', mystic: '미스틱', nandoah: '난도아', nightscape: '나이트스케이프', nucleus: '뉴클리어스', oasis: '오아시스',
  ocean: '오션', olive: '올리브', orange: '오렌지', orca: '오르카', ottanio: '오타니오', petrol: '페트롤', phantom: '팬텀', pink: '핑크',
  pitaya: '피타야', plaid: '플래드', pool: '풀', rain: '레인', rainyday: '레이니데이', raspberry: '라즈베리', renegade: '레니게이드',
  rose: '로즈', rune: '룬', rust: '러스트', rustrocks: '러스트록스', saffron: '사프란', sage: '세이지', salt: '솔트', sapphire: '사파이어',
  sea: '씨', shadowcast: '섀도캐스트', shark: '샤크', silk: '실크', slate: '슬레이트', smoke: '스모크', solitude: '솔리튜드',
  soulsonic: '소울소닉', spicy: '스파이시', sprint: '스프린트', steel: '스틸', stratus: '스트라투스', stripes: '스트라이프', sulphur: '설퍼',
  tatsu: '타츠', tide: '타이드', tonic: '토닉', tropograph: '트로포그래프', turquoise: '터쿼이즈', ultima: '울티마', vapor: '베이퍼',
  velocity: '벨로시티', void: '보이드', washed: '워시드', waterfall: '워터폴', whitaker: '휘태커', white: '화이트', woods: '우즈',
  yellow: '옐로우', russet: '러셋',
  // 이름(스노우피크 의류·잡화)
  technical: '테크니컬', alan: '알란', knit: '니트', calamai: '칼라마이', wool: '울', fleece: '플리스', pullover: '풀오버', shibori: '시보리',
  dyeing: '다잉', down: '다운', jacket: '재킷', '2-days': '2데이즈', camping: '캠핑', pack: '팩', tee: '티', alpha: '알파', direct: '다이렉트',
  hoodie: '후디', flexible: '플렉서블', insulated: '인슐레이티드', shirt: '셔츠', skirt: '스커트', anorak: '아노락', octa: '옥타',
  nomad: '노마드', triple: '트리플', cloth: '클로스', jumper: '점퍼', 'water-repellent': '발수', wind: '윈드', tricot: '트리코', zip: '집',
  parka: '파카', takibi: '타키비', storage: '스토리지', vest: '베스트', peak: '피크', shell: '쉘', cardigan: '카디건', everyday: '에브리데이',
  "w's": '여성', "m's": '남성', pertex: '퍼텍스', weight: '웨이트', breathable: '브레서블', coat: '코트', hybrid: '하이브리드',
  adjustable: '어저스터블', pants: '팬츠', stretch: '스트레치', relaxed: '릴랙스드', 'all-in-one': '올인원', corduroy: '코듀로이',
  agility: '어질리티', boa: '보아', utility: '유틸리티', carry: '캐리', bag: '백', low: '로우', chair: '체어', cover: '커버', pole: '폴',
  padded: '패디드', 'slip-on': '슬립온', muffler: '머플러', flight: '플라이트', cap: '캡', balaclava: '발라클라바', stripe: '스트라이프',
  field: '필드', hand: '핸드', towel: '타월', packable: '패커블', reusable: '리유저블', grocery: '그로서리', 'ti-single': '티타늄 싱글',
  mug: '머그', shoulder: '숄더', thermo: '써모', edition: '에디션', kasuri: '카스리', days: '데이즈', water: '워터', repellent: '리펠런트',
  all: '올', in: '인', one: '원', slip: '슬립', on: '온', ti: '티타늄', single: '싱글',
  // 영문뿐인 thegearshop 이름(선갓·코토팍시)
  chelsea: '첼시', sodaro: '소다로', forty2s: '포티투스', classics: '클래식스', courtney: '코트니', dauwalter: '다우월터', mclaren: '맥라렌',
  renegades: '레니게이즈', dynafly: '다이나플라이', downtek: '다운텍', fireline: '파이어라인', double: '더블', pro: '프로', '8ko': '8KO',
};
const NAME_WORDS = {
  'set-up': '셋업', warm: '웜', daypack: '데이팩', atelier: '아틀리에', line: '라인', trail: '트레일', 'mount/age': '마운트/에이지',
  jiyongkim: '지용킴', wigo: '위고', kaws: '카우스', hero: '히어로', heavy: '헤비', 'high-loft': '하이로프트', airpath: '에어패스',
  puffy: '퍼피', born: '본', wild: '와일드', light: '라이트', seoul: '서울', exclusive: '익스클루시브', summitlite: '서밋라이트',
  'x-line': '엑스라인', boa: '보아', mid: '미드', pro: '프로', bed: '베드', way: '웨이', set: '세트', 'pro.air': '프로에어', 'pro.': '프로',
  downtek: '다운텍', fireline: '파이어라인', eco: '에코', double: '더블', wide: '와이드', long: '롱', forty2s: '포티투스', thermo: '써모',
  edition: '에디션', kasuri: '카스리', dynafly: '다이나플라이',
};
const KEEP = /^(?:[A-Z0-9][A-Z0-9.]{0,3}|C\/N|\d+[A-Za-z]*|[A-Z]{1,3}\d*)$/; // 코드·짧은 약어·숫자는 유지(FR, 2L, SP, HV, EWO, C/N)
const tr = (w) => W[w.toLowerCase()] ?? (KEEP.test(w) ? w : null);
// 단어 단위 음역. 사전에 없는 영문 단어가 남으면 원문을 돌려주고 missing 에 기록
const missing = new Set();
const koWords = (s) =>
  String(s)
    .split(/(\s+)/)
    .map((t) => {
      if (!t || /^\s*[-/]?\s*$/.test(t)) return t.trim() ? t.trim() : t && ' ';
      if (/[가-힣]/.test(t) && !/[A-Za-z]{3,}/.test(t)) return t;
      // "THERMO텀블러360" 처럼 한글에 붙은 영문 단어
      return t.replace(/[A-Za-z][A-Za-z0-9'-]*[A-Za-z0-9]|[A-Za-z]/g, (m) => {
        const k = tr(m) ?? (m.includes('-') && m.split('-').every((x) => tr(x) != null) ? m.split('-').map(tr).join('-') : null);
        if (k == null) missing.add(m);
        return k ?? m;
      });
    })
    .join('')
    .replace(/\s{2,}/g, ' ')
    .trim();
const out = [];
for (const r0 of rows) {
  const r = { ...r0 };
  // 사이즈: Free/ALL/One Size → 없음, 옵션값이 제품명 자체(스카르파 부츠 "F1 LT")면 없음
  const base = (n, z) => (z && n.endsWith(` ${z}`) ? n.slice(0, -z.length - 1) : n);
  if (r.size && (/^(free|all|one( ?size)?|os)$/i.test(r.size) || base(r.nameKorean, r.sizeKorean) === r.sizeKorean)) {
    r.nameKorean = base(r.nameKorean, r.sizeKorean);
    r.name = r.name.replace(new RegExp(`\\s*/\\s*${r.size.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '');
    r.size = '';
    r.sizeKorean = '';
  }
  // 한글 필드 영문 → 한글
  if (r.colorKorean && /[A-Za-z]{3,}/.test(r.colorKorean)) {
    r.colorKorean = koWords(r.colorKorean);
  }
  // 이름: 스노우피크는 섞인 영문 단어까지, 그 외(코오롱 HERO·[MOUNT/AGE] 등 라인명은 기존 DB 표기 유지)는 한글이 전혀 없는 이름만
  if ((r.company === 'snowpeak' && /[A-Za-z]{4,}/.test(r.nameKorean)) || !/[가-힣]/.test(r.nameKorean)) r.nameKorean = koWords(r.nameKorean);
  // 소문자 사이즈 코드("s") → 대문자(스노우피크 타키비 스토리지 베스트 FOLIAGE)
  if (/^(x{0,3}[sml]|xxl)$/.test(r.size)) {
    const up = r.size.toUpperCase();
    r.name = r.name.replace(new RegExp(` / ${r.size}$`), ` / ${up}`);
    r.nameKorean = r.nameKorean.replace(new RegExp(` ${r.sizeKorean}$`), ` ${up}`);
    r.size = up;
    r.sizeKorean = up;
  }
  // 한글명에 섞인 일반 영단어·라인명 → 한글(코드·약어 WM/UL/GTX/KS/SV 등은 유지, 사용자 룰: 모델명까지 한글)
  r.nameKorean = r.nameKorean.replace(/(?<![A-Za-z0-9])[A-Za-z][A-Za-z0-9.]*(?:[-/][A-Za-z][A-Za-z0-9.]*)*(?![A-Za-z0-9])/g, (m) => NAME_WORDS[m.toLowerCase()] ?? m);
  // 배낭·베스트팩: 사이즈 옵션이 없으면 용량을 사이즈로(이름의 "12L" 또는 아크테릭스 모델 숫자 = 리터)
  if (['backpack', 'vest_pack'].includes(r.category) && !r.size) {
    const vol = r.specs?.volume || r.name.match(/(\d+(?:\.\d+)?)\s*L\b/i)?.[1] || (r.company === 'arcteryx' && !/index|bouldering/i.test(r.name) ? r.name.match(/\b(\d{1,2})\b/)?.[1] : '');
    if (vol) {
      r.specs = { ...(r.specs || {}), volume: Number(vol) };
      r.size = `${vol}L`;
      r.sizeKorean = `${vol}L`;
      if (!r.name.endsWith(` / ${r.size}`)) r.name = `${r.name} / ${r.size}`;
      if (!r.nameKorean.endsWith(` ${r.size}`)) r.nameKorean = `${r.nameKorean} ${r.size}`;
    }
  }
  // 코오롱: color(영문)가 한글 로마자 음역("Beulraek")이라 colorKorean 을 색상 사전으로 영문화
  if (r.company === 'kolon-sport' && r.colorKorean) r.color = colorKoToEn(r.colorKorean);
  // 러기지 택(코토팍시)은 배낭이 아님
  if (/luggage tag/i.test(r.name)) {
    r.category = 'etc';
    r.specs = {};
  }
  out.push(r);
}
// 사이트가 같은 사이즈를 대소문자만 다르게 두 번 올린 경우("S"·"s", 스노우피크 타키비 스토리지 베스트) → 대문자 행만 남김
const seenKey = new Set(out.filter((r) => r.size === r.size.toUpperCase()).map((r) => `${r.groupId}|${r.color}|${r.size}`));
const deduped = out.filter((r) => r.size === r.size.toUpperCase() || !seenKey.has(`${r.groupId}|${r.color}|${r.size.toUpperCase()}`));
out.length = 0;
out.push(...deduped);
writeFileSync(dst, JSON.stringify(out, null, 2));
console.log(`${src} → ${dst} (${out.length}행)`);
if (missing.size) console.log('사전 미등재:', [...missing].join(' '));

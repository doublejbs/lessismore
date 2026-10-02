// 파고웍스(paagoworks.com) — Shopify 스토어(일본 UL 브랜드 PAAGO WORKS, 일본어 사이트).
// 리스팅/변형/이미지는 products.json API, 무게·스펙은 상품페이지 서버렌더 스펙표(라벨/값 쌍)에서.
//
// ⚠ 무게: variants[].grams는 배송무게라 부정확(ALK 16/24/30 전부 1100, ZENN 25/35/45 전부 1000,
//    소품은 16g 기본값). 실제 무게는 상품페이지 스펙표 「重量」 행. 포맷이 여러 가지:
//      · 단일:        "約670g", "1160g（最小重量）", "1770g（付属品込み）"
//      · 본체+부속:    "本体：785g、デタッチャブルポケット：85g、ヒップハーネス：130g" → 본체만
//      · 세트(무키):   "68g（チタンカップ）、30g（シリコンキャップ）" → 합산
//      · 변형별(키):   "M：122g / L：138g", "PC Light Gray / PC Black ：75g / Gray / Blue：80g",
//                     "Sサイズ：35g / Mサイズ：45g", "Normal:350g（2本）　SL:300g" → 옵션값과 키 매칭
//    스펙표가 아예 없는 소품 9개(POPS Bag/Attachment/ガイライン 등)는 무게 0(정상).
// ⚠ 이름·소재가 일본어 → 이 어댑터에서 바로 영문 name / 한글 nameKorean·소재로 변환(별도 kr-apply 없음).
//    nameKorean엔 브랜드명 금지, 모델명까지 한글 음역(RUSH=러쉬는 국내 판매처 굿러너 표기).
// ⚠ 타사 셀렉트 상품: Carry the Sun Warm Light는 DB에 이미 있어 제외(EXCLUDE). Big Forest 그릴 플레이트,
//    Gear Aid 심그립 리페어킷은 DB에 없어 포함하되 company는 실제 제조사(THIRD_PARTY).
// ⚠ volume/capacity/waterproofRating은 숫자만(스키마 type:number, 단위는 앱이 붙임).
import { execFileSync } from 'node:child_process';

const BASE = 'https://www.paagoworks.com';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const EXCLUDE = new Set(['warm-light']); // Carry the Sun — DB에 Solar Portable Light S/M로 기존재
const THIRD_PARTY = {
  'grill-plate-karupen': { company: 'Big Forest', companyKorean: '빅포레스트' },
  'seam-grip-wp-field-repair-kit': { company: 'Gear Aid', companyKorean: '기어에이드' },
};

const sleep = (ms) => execFileSync('sleep', [String(ms / 1000)]);
const curlGet = (url, marker = null, retries = 4) => {
  for (let i = 0; i < retries; i++) {
    try {
      const out = execFileSync('curl', ['-s', '--compressed', '-A', UA, url], { maxBuffer: 64 * 1024 * 1024, encoding: 'utf-8' });
      if (out && out.length > 500 && (!marker || out.includes(marker))) return out;
    } catch (e) {
      /* 재시도 */
    }
    sleep(400 * (i + 1));
  }
  return '';
};
const fetchJson = (url) => {
  try {
    return JSON.parse(curlGet(url));
  } catch (e) {
    return null;
  }
};

// ── 카테고리 (product_type 절반이 빈값 → handle/이름 기준). 부속을 본 라인보다 먼저 판정. ──
const classify = (handle, name) => {
  const s = `${handle} ${name}`.toLowerCase();
  if (/harness|gear-strap|gear-sleeve|attachment|shoulder-belt|comfort-belt|pole-holder|seam-grip/.test(s)) return 'etc';
  if (/meshbag|dry-sack|w-face|trail-?bank|pops|first-aid|rush-?hip|rush-plus/.test(s)) return 'pouch';
  if (/switch|snap|pathfinder|focus/.test(s)) return 'pouch';
  if (/^rush-3r/.test(handle)) return 'vest_pack'; // 상품페이지가 직접 "ベスト"라 칭하는 건 3R뿐
  if (/zenn-?\d\d|alk-|buddy|cargo|rush/.test(s)) return 'backpack';
  if (/ninja-tent/.test(s)) return 'tent';
  if (/ninja-nest/.test(s)) return 'tent_acc'; // NINJA TARP/SHELTER용 이너텐트
  if (/shelter/.test(s)) return 'shelter';
  if (/ninja-tarp/.test(s)) return 'tarp';
  if (/peg|guyline|shuriken|ninja-stick/.test(s)) return 'tent_acc';
  // 조리는 crawl-pipeline-category-handoff.md §3 규칙에 맞춘다(집게/tong→cutlery, 팬→cookware, 화로→stove)
  if (/trail-cup/.test(s)) return 'cup';
  if (/trailpot|grill-plate/.test(s)) return 'cookware'; // 그릴 플레이트 かるpan = 팬
  if (/gotokutongs/.test(s)) return 'cutlery'; // 五徳トング = 집게
  if (/firestand/.test(s)) return 'stove'; // 焚き火台(화로대) 겸 스토브 받침
  return 'etc'; // 火吹棒/ステンレスメッシュ
};

// ── 상품페이지 스펙표 파싱: 라벨 → 값 줄 배열 ──
const LABELS = ['サイズ', '重量', '容量', '主素材', '素材', '耐水圧', '収容人数', '背面長', '付属品', 'メーカー', '収納サイズ', '使用シーズン', '満水容量（丸型プラカップ）', '満水容量（まめ型プラカップ）', '満水容量（丸型チタンカップ）'];
// 값 블록이 끝나는 표식(라벨이 아닌 페이지 잔여 텍스트)
const STOP = /^(PRODUCTS|PRODUCT|ALL|HIKE|注意|注意事項|関連記事|お手入れ|RUSH特設ページ|着用ウエストサイズ|対応ロープ径|明るさ|充電時間)/;
const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

const fetchSpecs = (handle) => {
  const html = curlGet(`${BASE}/products/${handle}`, 'PAAGO');
  if (!html) return {};
  const text = decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '\n'));
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const specs = {};
  lines.forEach((l, i) => {
    if (!LABELS.includes(l) || specs[l]) return;
    const vals = [];
    for (let j = i + 1; j < lines.length && vals.length < 4; j++) {
      if (LABELS.includes(lines[j]) || STOP.test(lines[j])) break;
      vals.push(lines[j]);
    }
    if (vals.length) specs[l] = vals;
  });
  return specs;
};

// "키：값" 세그먼트 추출. 키는 문자로 시작, 괄호·구분자 미포함. unitRe는 값의 숫자+단위 패턴.
const keyedValues = (text, unitRe) => {
  const re = new RegExp(`([A-Za-z\\u3040-\\u30ff\\u4e00-\\u9fff][^:：\\n、（）()]*?)\\s*[:：]\\s*約?\\s*${unitRe.source}`, 'g');
  return [...text.matchAll(re)].map((m) => ({ key: m[1].trim(), num: parseFloat(m[2].replace(/,/g, '')), unit: m[3] }));
};

// 변형 옵션값에서 형제 값들과 공통인 토큰을 뺀 구별 토큰. ("SWITCH M EXP"→"M", "NINJA STICK"→"")
const distinctToken = (value, siblings) => {
  const toks = (v) => v.toUpperCase().replace(/SIZE/g, '').split(/\s+/).filter(Boolean);
  const all = siblings.map(toks);
  const common = all.length > 1 ? all[0].filter((t) => all.every((ts) => ts.includes(t))) : [];
  return toks(value).filter((t) => !common.includes(t)).join(' ');
};
const normKey = (k) => k.toUpperCase().replace(/サイズ/g, '').replace(/トレイルカップ/g, 'TRAIL CUP').trim();
// 키 세그먼트 중 이 변형(구별 토큰들)에 해당하는 것. 키 안의 "A / B"는 대안 목록.
// 정확 일치 먼저 → 꼬리 일치("DRY SACK 1"↔"1"). 순서를 바꾸면 색상 Gray가 "PC Light Gray"에 걸린다.
const pickKeyed = (segs, tokens) => {
  const altsOf = (seg) => seg.key.split(/\s*\/\s*/).map(normKey).filter(Boolean);
  const live = tokens.filter(Boolean);
  const exact = segs.find((seg) => altsOf(seg).some((a) => live.includes(a)));
  if (exact) return exact;
  const tail = segs.find((seg) => altsOf(seg).some((a) => live.some((t) => a.endsWith(` ${t}`))));
  if (tail) return tail;
  // 구별 토큰이 비면(기본형) "NORMAL" 키
  if (tokens.some((t) => t === '')) return segs.find((s) => normKey(s.key) === 'NORMAL') || null;
  return null;
};

// ⚠ 반올림 금지(SKILL 룰) — 사이트 표기 그대로(16.5g). 합산 시 부동소수 오차만 소수1자리로 정리.
const toGrams = (n, unit) => (unit.toLowerCase() === 'kg' ? n * 1000 : n);
const tidy = (n) => Math.round(n * 10) / 10;
const weightFor = (specs, category, tokens) => {
  const text = (specs['重量'] || []).join('\n');
  if (!text) return 0;
  const segs = keyedValues(text, /([\d.,]+)\s*(kg|g)\b/i);
  const body = segs.find((s) => s.key === '本体');
  if (body) return tidy(toGrams(body.num, body.unit));
  if (segs.length) {
    const hit = pickKeyed(segs, tokens) || segs[0];
    return tidy(toGrams(hit.num, hit.unit));
  }
  const all = [...text.matchAll(/([\d.,]+)\s*(kg|g)\b/gi)].map((m) => toGrams(parseFloat(m[1].replace(/,/g, '')), m[2]));
  if (!all.length) return 0;
  // 키 없는 복수 값 = 세트 구성(컵+캡 등) → 합산
  return tidy(['cookware', 'cup', 'cookware_etc'].includes(category) ? all.reduce((a, b) => a + b, 0) : all[0]);
};

const numStr = (n) => String(Math.round(n * 10) / 10);
// 용량(L) — 본체 키 우선, 변형 키 매칭, 그 외 첫 값. 숫자만 반환.
const litersFor = (specs, tokens) => {
  const text = (specs['容量'] || []).join('\n');
  if (!text) return '';
  const segs = keyedValues(text, /([\d.]+)\s*(L|ml)\b/i);
  // 본체+디태처블 포켓 표기면 합계(ZENN 35 = 本体30L + ポケット5L → 35, 모델명 숫자와 일치)
  if (segs.some((s) => s.key === '本体')) return numStr(segs.reduce((a, s) => a + (s.unit.toLowerCase() === 'ml' ? s.num / 1000 : s.num), 0));
  if (segs.length) {
    const hit = pickKeyed(segs, tokens) || segs[0];
    return numStr(hit.unit.toLowerCase() === 'ml' ? hit.num / 1000 : hit.num);
  }
  const m = text.match(/([\d.]+)\s*(L|ml)\b/i);
  if (!m) return '';
  return numStr(m[2].toLowerCase() === 'ml' ? parseFloat(m[1]) / 1000 : parseFloat(m[1]));
};
// 용량(ml) — 쿡웨어/컵. label 지정 시 그 행(트레일 컵 = 세트 중 최대인 티타늄 컵).
const mlFor = (specs, tokens, label = '容量') => {
  const text = (specs[label] || []).join('\n');
  if (!text) return '';
  const segs = keyedValues(text, /([\d.]+)\s*(L|ml)\b/i);
  const hit = segs.length ? pickKeyed(segs, tokens) || segs[0] : null;
  const m = hit ? [null, String(hit.num), hit.unit] : text.match(/([\d.]+)\s*(L|ml)\b/i);
  if (!m) return '';
  const v = parseFloat(m[1]);
  return String(Math.round(m[2].toLowerCase() === 'l' ? v * 1000 : v));
};

// ── 소재 일→한 사전(긴 것 먼저 치환) ──
const MATERIAL_JA = [
  ['エクストリーマグリッドナイロン', '익스트리마 그리드 나일론'],
  ['ナイロンテフロンコーティング', '테플론 코팅 나일론'],
  ['PCコーティングナイロン', 'PC 코팅 나일론'],
  ['ナイロンPCコーティング', 'PC 코팅 나일론'],
  ['シリコン/PUコーティング', '실리콘/PU 코팅'],
  ['シリコンコーティング', '실리콘 코팅'],
  ['ストレッチメッシュ', '스트레치 메쉬'],
  ['飽和コポリエステル', '포화 코폴리에스터'],
  ['ポリカーボネイト', '폴리카보네이트'],
  ['ポリエチレン', '폴리에틸렌'],
  ['ポリエステル', '폴리에스터'],
  ['アルミニウム', '알루미늄'],
  ['ステンレス', '스테인리스'],
  ['耐熱シリコン', '내열 실리콘'],
  ['難燃シリコン', '난연 실리콘'],
  ['シリコンリング', '실리콘 링'],
  ['シリコン', '실리콘'],
  ['プラカップ', '플라스틱 컵'],
  ['チタンカップ', '티타늄 컵'],
  ['チタン', '티타늄'],
  ['ナイロン', '나일론'],
  ['メッシュ', '메쉬'],
  ['ボトム部分', '바닥'],
  ['本体', '본체'],
  ['ハンドル', '핸들'],
  ['デニール', 'D'],
];
const materialKo = (raw) => {
  let s = raw
    .replace(/（(国産|中国製|日本製)）|\((国産|中国製|日本製)\)/g, '')
    .replace(/（本体は防水ではありません）/g, '')
    .replace(/[：]/g, ': ')
    .replace(/、/g, ', ')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')');
  for (const [ja, ko] of MATERIAL_JA) s = s.split(ja).join(ko);
  s = s.replace(/(\d+)\s+D\b/g, '$1D').replace(/(\d+D)(?=[가-힣])/g, '$1 ').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim();
  if (/[぀-ヿ一-鿿]/.test(s)) console.warn(`[paagoworks] ⚠ 소재 일본어 잔존: ${s}`);
  return s;
};
// 색상별 소재("PC Light Gray / PC Black ：PCコーティングナイロン")면 해당 색 줄, 아니면 첫 줄.
const materialFor = (specs, color) => {
  const vals = specs['主素材'] || specs['素材'];
  if (!vals) return '';
  const keyedLines = vals.filter((v) => /^[A-Za-z][^：:]*[：:]/.test(v) && !/^プラカップ/.test(v));
  if (keyedLines.length && color) {
    // 한 줄에 여러 키가 "、"로 이어진 경우(구형 SWITCH)도 분해
    const parts = keyedLines.flatMap((l) => l.split(/、(?=[A-Za-z])/));
    const c = color.toUpperCase();
    const hit = parts.find((p) => p.split(/[：:]/)[0].split('/').some((k) => k.trim().toUpperCase().replace(/\bMOS\b/, 'MOSS') === c));
    if (hit) return materialKo(hit.split(/[：:]/).slice(1).join(':'));
  }
  if (keyedLines.length) return materialKo(keyedLines[0].split(/[：:]/).slice(1).join(':'));
  return materialKo(vals[0]);
};

const firstNum = (vals) => {
  const m = (vals || []).join(' ').replace(/,/g, '').match(/(\d+)/);
  return m ? m[1] : '';
};

const buildSpecs = (category, handle, specs, tokens, color) => {
  const s = {};
  const material = materialFor(specs, color);
  if (category === 'backpack' || category === 'vest_pack') {
    const v = litersFor(specs, tokens);
    if (v) s.volume = v;
    if (material) s.material = material;
    if (/zenn/.test(handle)) s.hasHipBelt = true; // ZENN: 히프 하네스/벨트 부속
  } else if (category === 'pouch') {
    const v = litersFor(specs, tokens);
    if (v) s.capacity = v;
    if (material) s.material = material;
    if (/dry-sack/.test(handle)) s.isWaterproof = true;
  } else if (['tent', 'shelter', 'tarp'].includes(category)) {
    const cap = firstNum(specs['収容人数']); // "2名" / "2〜3人"(최소값)
    if (cap) s.capacity = cap;
    if (material) s.flyMaterial = material;
    const wp = firstNum(specs['耐水圧']); // "2,000mm" / "3700mm（…）"
    if (wp) s.waterproofRating = wp;
  } else if (['cookware', 'cup', 'cookware_etc'].includes(category)) {
    if (material) s.material = material;
    // 트레일 컵은 3종 세트(둥근/콩 플라스틱 + 티타늄) → 최대인 티타늄 컵 용량(사용자 결정 2026-10)
    const ml = /trail-cup/.test(handle) ? mlFor(specs, tokens, '満水容量（丸型チタンカップ）') : mlFor(specs, tokens);
    if (ml) s.capacity = ml;
    if (/trail-cup/.test(handle)) s.isSet = true;
  } else if (material) {
    s.material = material;
  }
  return s;
};

// ── 이름: 일본어 제목 → 영문 name ──
const NAME_EN = {
  'trailpot-r500-mlg': 'TRAILPOT R500 Moonlight Gear Edition',
  'peg-set': 'Peg Set',
  'trailpot-meshbag': 'TRAILPOT S1200P Mesh Bag',
  'shoulder-belt-old': 'Shoulder Belt (Old Model)',
  'comfort-belt-old': 'Comfort Shoulder (Old Model)',
  'guyline-for-ninja': 'NINJA Guyline',
  stainlessmesh: 'Stainless Mesh',
  hifukibo: 'Fire Blowing Pipe',
  gotokutongs: 'Gotoku Tongs',
  'grill-plate-karupen': 'Grill Plate Karupan',
};
const englishName = (handle, title) => {
  if (NAME_EN[handle]) return NAME_EN[handle];
  return title
    .replace(/\s*[（(]\s*(\d{4})年モデル\s*[）)]/, ' ($1 Model)')
    .replace(/\s*[（(]\s*旧モデル\s*[）)]/, ' (Old Model)')
    .replace(/^RUSH(\d)/, 'RUSH $1')
    .replace(/\s+/g, ' ')
    .trim();
};

// ── 한글명: 브랜드명 없이(회사는 companyKorean 필드), 모델명까지 전부 한글 음역 ──
// 국내 공식 수입사 없음(2026-10 확인). 국내 판매처 굿러너(goodrunner.co.kr)가 RUSH를 "러쉬"로 표기 → 그 표기 채택.
// 영문 유지는 숫자 섞인 코드(3R/11R/R500/S1200P/V2)·사이즈 글자(S/M/L/XL)·시리즈 약어(EXP/SP/WP)만.
const WORD_KO = {
  zenn: '젠', rush: '러쉬', snap: '스냅', switch: '스위치', alk: '알크', buddy: '버디', ninja: '닌자', trailpot: '트레일팟',
  'w-face': '더블페이스', pops: '팝스', focus: '포커스', pathfinder: '패스파인더', cargo: '카고', shuriken: '슈리켄',
  bc: '백컨트리', harness: '하네스', running: '러닝', snow: '스노우', stuff: '스터프', bag: '백', pouch: '파우치',
  pole: '폴', holder: '홀더', plus: '플러스', hip: '힙', shelter: '쉘터', tent: '텐트', tarp: '타프', dome: '돔',
  gear: '기어', strap: '스트랩', sleeve: '슬리브', stick: '스틱', cup: '컵', firestand: '파이어스탠드', solo: '솔로',
  lefty: '레프티', attachment: '어태치먼트', shoulder: '숄더', belt: '벨트', comfort: '컴포트', peg: '펙', set: '세트',
  mesh: '메쉬', guyline: '가이라인', stainless: '스테인리스', fire: '파이어', blowing: '블로잉', pipe: '파이프',
  gotoku: '고토쿠', tongs: '집게', grill: '그릴', plate: '플레이트', karupan: '카루팬', field: '필드', repair: '리페어',
  kit: '킷', first: '퍼스트', aid: '에이드', my: '마이', trail: '트레일', bank: '뱅크', nest: '네스트',
};
const KEEP_KO = /^(EXP|SP|WP|XL|[SML]|V\d|R\d+|S\d+P?|\d+R?)$/;
const koreanName = (name) =>
  name
    .replace(/\((\d{4}) Model\)/, '($1년 모델)')
    .replace(/\(Old Model\)/, '(구형 모델)')
    .replace(/Moonlight Gear Edition/, '문라이트기어 에디션')
    .replace(/Seam Grip/i, '심그립')
    .replace(/DRY SACK/i, '드라이색')
    .split(/\s+/)
    .map((t) => {
      const bare = t.replace(/[()]/g, '');
      if (!bare || KEEP_KO.test(bare) || /[가-힣]/.test(bare)) return t;
      const ko = WORD_KO[bare.toLowerCase()];
      if (ko === undefined) console.warn(`[paagoworks] ⚠ 한글명 미번역 토큰: ${bare} (${name})`);
      return ko !== undefined ? t.replace(bare, ko) : t;
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

// ── 변형 축 ──
const COLOR_KO = {
  'alpine blue': '알파인 블루', black: '블랙', blue: '블루', 'dark beige': '다크 베이지', 'dark gray': '다크 그레이',
  'foggy blue': '포기 블루', glacier: '글레이셔', 'glacier silver': '글레이셔 실버', gray: '그레이', 'light gray': '라이트 그레이',
  midnight: '미드나잇', 'moss green': '모스 그린', orange: '오렌지', 'pc black': 'PC 블랙', 'pc gray': 'PC 그레이',
  'pc light gray': 'PC 라이트 그레이', 'sand storm': '샌드 스톰', 'shadow gray': '섀도 그레이', 'urban gray': '어반 그레이',
  yellow: '옐로',
};
const SIZE_KO = { S: '스몰', M: '미디엄', L: '라지', XL: '엑스라지', SMALL: '스몰', MEDIUM: '미디엄', NORMAL: '노멀' };
const titleCase = (s) => s.replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/^Pc\b/, 'PC');
const isColorAxis = (o) => /color|colour|色/i.test(o.name) || o.values.every((v) => COLOR_KO[v.trim().toLowerCase()]);
const isSizeAxis = (o) => !isColorAxis(o) && /size|サイズ|スタイル/i.test(o.name);

const slugify = (s) => (s || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
const absImg = (src) => (src ? `https:${src}`.replace(/^https:https:/, 'https:') : '');

const buildRows = (p) => {
  const handle = p.handle;
  const name = englishName(handle, (p.title || '').trim());
  const third = THIRD_PARTY[handle];
  const company = third ? third.company : 'PAAGO WORKS';
  const companyKorean = third ? third.companyKorean : '파고웍스';
  const category = classify(handle, name);
  const specs = fetchSpecs(handle);
  const ci = p.options.findIndex(isColorAxis) + 1;
  const si = p.options.findIndex(isSizeAxis) + 1;
  const sizeValues = si ? p.options[si - 1].values : [];
  const mainImage = absImg(p.images && p.images[0] && p.images[0].src);
  // 변형별 이미지: images[].variant_ids 직접 매칭 우선(SAMAYA 룰: featured_image가 엉뚱한 색일 수 있음) → featured_image → 대표
  const imageFor = (v) => {
    const byId = (p.images || []).find((im) => (im.variant_ids || []).includes(v.id));
    return absImg((byId && byId.src) || (v.featured_image && v.featured_image.src)) || mainImage;
  };
  const rowBase = {
    // 멀티브랜드 룰: groupId 접두는 회사(타사 셀렉트 상품은 그 제조사 슬러그)
    groupId: `${third ? slugify(third.company) : 'paagoworks'}_${slugify(handle)}`,
    category,
    company,
    companyKorean,
    name,
    nameKorean: koreanName(name),
    imageUrl: mainImage,
    _detailUrl: `${BASE}/products/${handle}`,
    _source: `paagoworks_${category}`, // push.js가 _source별로 카테고리 일괄 적용 → 1:1 유지
    _handle: handle,
  };
  const rows = [];
  const seen = new Set();
  for (const v of p.variants || []) {
    const colorRaw = ci ? (v[`option${ci}`] || '').trim() : '';
    const sizeRaw = si ? (v[`option${si}`] || '').trim() : '';
    const color = colorRaw && colorRaw !== 'Default Title' ? titleCase(colorRaw) : '';
    let size = '';
    if (sizeRaw && sizeRaw !== 'Default Title') {
      const d = distinctToken(sizeRaw, sizeValues);
      size = d || 'Normal';
    }
    const key = `${color}|${size}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // 무게/용량 키 매칭 토큰: 사이즈 구별 토큰(없으면 ""=기본형) + 색상
    const tokens = [];
    if (si) tokens.push(size === 'Normal' ? '' : size.toUpperCase());
    if (color) tokens.push(color.toUpperCase());
    const rowSpecs = buildSpecs(category, handle, specs, tokens, color);
    let sizeKorean = size ? SIZE_KO[size.toUpperCase()] || size : '';
    let rowName = rowBase.name;
    let rowNameKorean = rowBase.nameKorean;
    // 숫자 옵션명이 용량처럼 보이지만 모델 구분명인 경우 → 사이즈는 실제 용량(사용자 결정 2026-10)
    //   TRAIL CUP 500/300 → 630ml/390ml, DRY SACK 1/4/8 → 1L/4L/8.5L
    //   모델 숫자는 이름에 남기고 실제 용량을 사이즈로 뒤에 붙인다: "TRAIL CUP 500 / 630ml"
    if (/^\d+(\.\d+)?$/.test(size) && rowSpecs.capacity) {
      rowName = `${rowName} ${size}`;
      rowNameKorean = `${rowNameKorean} ${size}`;
      size = `${rowSpecs.capacity}${category === 'pouch' ? 'L' : 'ml'}`;
      sizeKorean = size;
    }
    if (!size && (category === 'backpack' || category === 'vest_pack') && rowSpecs.volume) {
      // 배낭은 사이즈 옵션이 없으면 용량을 사이즈로(기존 DB HMG 관례 "40L").
      size = `${rowSpecs.volume}L`;
      sizeKorean = size;
    }
    if (size) {
      // 변형 룰: 사이즈는 예외 없이 이름 끝에 부착(영문 " / ", 한글 공백 + sizeKorean). 모델명 숫자와 겹쳐도 붙인다.
      rowName = `${rowName} / ${size}`;
      rowNameKorean = `${rowNameKorean} ${sizeKorean}`;
    }
    rows.push({
      ...rowBase,
      name: rowName,
      nameKorean: rowNameKorean,
      weight: weightFor(specs, category, tokens),
      specs: rowSpecs,
      color,
      colorKorean: color ? COLOR_KO[color.toLowerCase()] || color : '',
      size,
      sizeKorean,
      imageUrl: imageFor(v),
      _price: v.price || 0,
    });
  }
  return rows;
};

export { classify, buildSpecs, weightFor, keyedValues, distinctToken, koreanName, englishName, materialKo };

export default {
  name: 'paagoworks',
  company: 'PAAGO WORKS',
  companyKorean: '파고웍스',
  baseUrl: BASE,
  defaultCategories: ['all'],
  crawl: async () => {
    const rows = [];
    const seenHandle = new Set();
    for (let page = 1; ; page++) {
      const j = fetchJson(`${BASE}/products.json?limit=250&page=${page}`);
      if (!j || !j.products || !j.products.length) break;
      for (const p of j.products) {
        if (seenHandle.has(p.handle) || EXCLUDE.has(p.handle)) continue;
        seenHandle.add(p.handle);
        rows.push(...buildRows(p));
        console.log(`[paagoworks]   ${p.title} (${seenHandle.size})`);
      }
    }
    console.log(`[paagoworks] 완료 ${seenHandle.size}개 상품 / ${rows.length}행`);
    return rows;
  },
};

// 크롤 출력(JSON)을 SKILL.md "출력 검증 체크리스트" 전체에 대해 자동 검사한다.
// 사용법: node .claude/skills/crawl-gear/validate.js <크롤-json>
//
// ⚠ 언어 방향을 "양방향" 모두 검사한다(과거 실수: 영문필드에 한글만 보고, 한글필드에 영문은 안 봐서
//    nameKorean/colorKorean에 영문이 들어간 걸 통째로 놓침). name·size·color=영문, nameKorean·
//    sizeKorean·colorKorean=한글 — 어느 쪽이든 반대 언어가 섞이면 잡는다.
//
// 결과: ERROR(규칙 위반, 0이어야 함) / FLAG(사람 검토 필요 — 사이트가 원래 영문만 주는 등 정당한
//       예외일 수 있음) / INFO(커버리지) 3단계로 보고. ERROR가 하나라도 있으면 exit code 1.
import { readFileSync } from 'node:fs';
import { SPECS_SCHEMA, CATEGORY_KEYS } from './specs-schema.js';

const path = process.argv[2];
if (!path) {
  console.error('Usage: node validate.js <crawl-json>');
  process.exit(2);
}
const rows = JSON.parse(readFileSync(path, 'utf-8'));
const hasKorean = (s) => /[가-힣]/.test(s || '');
const hasLatin = (s) => /[A-Za-z]/.test(s || '');
const allowed = {};
for (const c of CATEGORY_KEYS) allowed[c] = new Set(Object.keys(SPECS_SCHEMA[c] || {}));

const REQUIRED = ['groupId', 'category', 'company', 'companyKorean', 'name', 'nameKorean', 'imageUrl', '_detailUrl'];
const idOf = (r) => r._godCd ?? r._productNo ?? r.groupId ?? '?';

const errors = {};
const flags = {};
const bump = (bag, key, r, detail) => {
  (bag[key] = bag[key] || { count: 0, ex: [] });
  bag[key].count++;
  if (bag[key].ex.length < 6) bag[key].ex.push(idOf(r) + (detail != null ? ` [${detail}]` : ''));
};
const err = (k, r, d) => bump(errors, k, r, d);
const flag = (k, r, d) => bump(flags, k, r, d);

const dk = new Map();
const dn = new Map();
for (const r of rows) {
  // 필수 필드 비어있지 않음 + null 금지
  for (const f of REQUIRED) if (r[f] === '' || r[f] == null) err(`필수 필드 빈값: ${f}`, r);
  for (const [f, v] of Object.entries(r)) if (v === null) err(`null 값(빈문자열 써야 함): ${f}`, r);

  // 언어 방향 — 영문 필드에 한글
  if (hasKorean(r.name)) err('name(영문)에 한글 누출', r, r.name);
  if (hasKorean(r.color)) err('color(영문)에 한글 누출', r, r.color);
  if (hasKorean(r.size)) err('size(영문)에 한글 누출', r, r.size);
  // 언어 방향 — 한글 필드에 영문만(한글 없음). 사이트가 원래 영문만 주면 정당 → FLAG.
  if (r.nameKorean && !hasKorean(r.nameKorean)) flag('nameKorean에 한글 없음(영문뿐)', r, r.nameKorean);
  if (r.colorKorean && !hasKorean(r.colorKorean)) flag('colorKorean에 한글 없음(영문뿐)', r, r.colorKorean);
  if (r.sizeKorean && !hasKorean(r.sizeKorean) && hasLatin(r.sizeKorean) && !/^[0-9A-Za-z/.\s-]+$/.test(r.sizeKorean))
    flag('sizeKorean에 한글 없음', r, r.sizeKorean);

  // 색상/사이즈 페어 — 한쪽만 채워지면 안 됨
  if ((r.color && !r.colorKorean) || (!r.color && r.colorKorean)) err('color/colorKorean 페어 불일치', r, `${r.color}|${r.colorKorean}`);
  if ((r.size && !r.sizeKorean) || (!r.size && r.sizeKorean)) err('size/sizeKorean 페어 불일치', r, `${r.size}|${r.sizeKorean}`);

  // groupId 형식 <brand>_<slug>
  if (!/^[a-z0-9-]+_.+/i.test(r.groupId || '')) err('groupId 형식 오류(<brand>_<slug> 아님)', r, r.groupId);

  // imageUrl HTTPS 절대 URL
  if (r.imageUrl && !/^https:\/\//.test(r.imageUrl)) err('imageUrl 비HTTPS', r, r.imageUrl);

  // _detailUrl(개별 상세 URL) 존재
  if (!r._detailUrl) err('_detailUrl 빈값(개별 상세 URL 필요)', r);

  // HTML 엔티티 잔존
  if (/&[a-z]+;|&#\d+;/i.test(`${r.name || ''}${r.nameKorean || ''}${r.color || ''}${r.colorKorean || ''}`))
    err('HTML 엔티티 잔존', r);

  // 카테고리 유효성
  if (!CATEGORY_KEYS.includes(r.category)) err('잘못된 카테고리 키', r, r.category);

  // spec 키가 스키마와 일치(오타 없음)
  const al = allowed[r.category] || new Set();
  for (const k of Object.keys(r.specs || {})) if (!al.has(k)) err(`스펙 키 오타/스키마 불일치: ${r.category}.${k}`, r);

  // spec 값 타입 — number 필드는 숫자만(단위 문자 금지: 앱이 unit을 붙여 "26LL" 버그), boolean 필드는 boolean
  for (const [k, v] of Object.entries(r.specs || {})) {
    const def = (SPECS_SCHEMA[r.category] || {})[k];
    if (!def || v === '') continue;
    if (def.type === 'number' && !/^-?\d+(\.\d+)?$/.test(String(v))) err(`숫자 스펙에 단위/문자: ${r.category}.${k}`, r, String(v));
    if (def.type === 'boolean' && typeof v !== 'boolean') err(`불리언 스펙 타입 오류: ${r.category}.${k}`, r, String(v));
  }

  // 필드 누락(undefined) — 빈값이어도 키는 있어야 함
  for (const f of ['color', 'colorKorean', 'size', 'sizeKorean']) if (r[f] === undefined) err(`필드 누락(undefined): ${f}`, r);

  // 일본어·한자 잔존(어느 텍스트 필드든) — 일본 사이트 크롤 시 번역 누락
  for (const f of ['name', 'nameKorean', 'color', 'colorKorean', 'size', 'sizeKorean'])
    if (/[぀-ヿ一-鿿]/.test(r[f] || '')) err(`일본어/한자 잔존: ${f}`, r, r[f]);

  // 제품명에 회사·브랜드명 금지(회사는 company/companyKorean 필드에만)
  // 예외(사용자 결정): 모델명 자체가 브랜드명인 제품 — 브랜드명 바로 뒤에 모델 번호가 오는 경우만 허용
  //   samaya: 텐트 "Samaya 3.5"/"사마야 3.5" (2026-11-17 사용자 확정, brands/samaya.md)
  const BRAND_IS_MODEL = { samaya: /^(samaya|사마야)\s*\d/i };
  const modelOk = BRAND_IS_MODEL[r.company] && BRAND_IS_MODEL[r.company].test(r.name || '') && BRAND_IS_MODEL[r.company].test(r.nameKorean || '');
  const brandTokens = [r.company, r.companyKorean].filter((b) => b && b.length >= 2);
  for (const b of brandTokens)
    if (!modelOk && `${r.name} ${r.nameKorean}`.toLowerCase().includes(b.toLowerCase())) err('제품명에 브랜드명 포함', r, `${b} ∈ ${r.nameKorean}`);

  // 한글 필드에 영문 단어 섞임 — 숫자 섞인 코드(3R/R500/V2)·사이즈 글자(S/M/L/XL)·짧은 대문자 약어(EXP/GTX/UL/PC)만 허용
  const latinWords = (s) => (s || '').match(/[A-Za-z][A-Za-z-]*/g) || [];
  // 단위 표기(cm/mm/ml/oz/kg/in)는 한글 필드에도 그대로 쓰는 게 관례라 허용
  const okCode = (t) => /^[A-Z]{1,3}$/.test(t) || /^(XS|XXL|XXXL|cm|mm|ml|oz|kg|in|ft)$/i.test(t);
  const stray = (s) => latinWords(s.replace(/[A-Za-z]*\d[A-Za-z\d]*/g, ' ')).filter((t) => !okCode(t));
  if (hasKorean(r.nameKorean) && stray(r.nameKorean).length) flag('nameKorean에 영문 단어 섞임', r, stray(r.nameKorean).join(','));
  if (hasKorean(r.colorKorean) && stray(r.colorKorean).length) flag('colorKorean에 영문 단어 섞임', r, stray(r.colorKorean).join(','));

  // 사이즈 — 예외 없이 이름 끝에 부착(영문 " / size", 한글 " sizeKorean")
  if (r.size && !(r.name || '').endsWith(` / ${r.size}`)) err('size가 name 끝에 미부착', r, `${r.name} | ${r.size}`);
  if (r.sizeKorean && !(r.nameKorean || '').endsWith(` ${r.sizeKorean}`)) err('sizeKorean이 nameKorean 끝에 미부착', r, `${r.nameKorean} | ${r.sizeKorean}`);
  // 숫자 사이즈 = 실제 용량(모델명 숫자를 사이즈로 쓰지 말 것: TRAIL CUP 500 → 630ml)
  const sizeNum = (r.size || '').match(/^(\d+(?:\.\d+)?)\s*(L|ml)?$/i); // 단위 없는 숫자("500")도 용량으로 읽히므로 포함
  const capKey = r.specs?.volume !== undefined ? 'volume' : 'capacity';
  const capVal = r.specs?.[capKey];
  // 단위 환산: 사이즈 "2L" ↔ 스키마 unit ml(물통 capacity 2000)
  const specUnit = ((SPECS_SCHEMA[r.category] || {})[capKey]?.unit || '').toLowerCase();
  const sizeUnit = (sizeNum?.[2] || specUnit).toLowerCase();
  const sizeInSpecUnit = sizeNum ? Number(sizeNum[1]) * (sizeUnit === 'l' && specUnit === 'ml' ? 1000 : sizeUnit === 'ml' && specUnit === 'l' ? 0.001 : 1) : NaN;
  if (sizeNum && capVal !== undefined && capVal !== '' && Math.abs(sizeInSpecUnit - Number(capVal)) > 1e-6)
    err('숫자 사이즈 ≠ 용량 스펙', r, `size=${r.size} spec=${capVal}`);
  // 배낭은 사이즈 옵션이 없으면 용량을 사이즈로
  if (['backpack', 'vest_pack'].includes(r.category) && !r.size && r.specs?.volume) err('배낭 size 빈값(용량을 사이즈로)', r, `volume=${r.specs.volume}`);

  // ── 2026-11 리프레시 행별 검토에서 나온 유형(사람이 찾은 것 → 자동 검사로) ──
  // One Size/Default Title 은 "사이즈 없음" — 사이즈로 넣지 않는다(3F 레인 판초 "MUTI USE PONCHO / one size")
  for (const f of ['size', 'sizeKorean'])
    if (/(^|\/\s*)(one\s*size|onesize|one|default\s*title|free\s*size|free|all|원\s*사이즈)(\s*\/|$)/i.test(r[f] || '')) err(`${f}에 One Size/Default(사이즈 없음으로 처리)`, r, r[f]);
  // 변형값 파싱 잔해: 빈 조각("3 Season / /Brown"), 앞뒤 슬래시
  for (const f of ['size', 'sizeKorean', 'name', 'nameKorean'])
    if (/\/\s*\/|^\s*\/|\/\s*$/.test(r[f] || '')) err(`${f}에 빈 조각("/ /")`, r, r[f]);
  // 이름 속 단어 반복("레인 판초 레인 판초 집" — 변형값에 제품명이 다시 들어감)
  const dupPhrase = (s) => {
    const t = (s || '').toLowerCase().split(/[\s/]+/).filter(Boolean);
    for (let n = 2; n <= 3; n++) for (let i = 0; i + 2 * n <= t.length; i++) if (t.slice(i, i + n).join(' ') === t.slice(i + n, i + 2 * n).join(' ')) return t.slice(i, i + n).join(' ');
    return '';
  };
  // 2026-11 리프레시에서 발견한 유형
  //  - 글자 단위 음역으로 깨진 한글 색상("브을아크크"=Black, "크흐아르크오아을"=Charcoal) — 블랙다이아몬드
  if (/브을|크흐|트흐|으[르을]|[가-힣]이이[가-힣]/.test(r.colorKorean || '')) err('colorKorean 글자단위 음역(깨진 한글)', r, r.colorKorean);
  //  - color(영문)에 한글 로마자 음역("Beulraek"=블랙, "Neibi"=네이비) — 코오롱
  if (/\b(?:Beul|Neibi|Geurei|Geurin|Raiteu|Dakeu|Beuraun|Chakol|Olribeu|Hwaiteu|Beiji)\w*/.test(r.color || '')) err('color(영문)에 로마자 음역(영문 색상명 써야 함)', r, r.color);
  //  - 소문자 사이즈 코드("s") — 스노우피크
  if (/^(x{0,3}[sml]|xxl)$/.test(r.size || '')) err('사이즈 코드 소문자(대문자로)', r, r.size);
  //  - 사이즈 옵션값이 제품명 자체("F1 LT / F1 LT") — 스카르파
  if (r.size && (r.name || '').replace(` / ${r.size}`, '') === r.size) err('사이즈가 제품명 자체(사이즈 없음 처리)', r, r.size);
  for (const f of ['name', 'nameKorean']) if (dupPhrase(r[f])) flag(`${f}에 단어 반복(변형값에 제품명 중복 의심)`, r, r[f]);
  // 사이즈에 색상 단어(색상이 size 로 새는 축 판별 실수 의심)
  if (r.size && /(^|[\s/])(black|white|grey|gray|brown|green|blue|red|khaki|olive|navy|yellow|orange|purple|pink|beige|tan|sand)([\s/]|$)/i.test(r.size))
    flag('size에 색상 단어(색상↔사이즈 축 확인)', r, r.size);
  // 카테고리 대비 무게 이상 — 원단 밀도(g/m²)·부품 무게를 본품 무게로 오인했거나 카테고리 오분류 신호
  // (2026-11: 텐트 40g = "Fabric weight 40g(m²)" 오인, 침낭 매트 95g = 접이식 깔개 오분류)
  const MIN_W = { tent: 300, shelter: 150, tarp: 100, sleeping_bag: 150, mat: 150, chair: 250, table: 150, backpack: 50, stove: 10 };
  const MAX_W = { cup: 1500, bottle: 2000, pouch: 5000, clothing: 3000, gloves: 1500, mat: 4000, backpack: 6000 };
  if (r.weight > 0 && MIN_W[r.category] && r.weight < MIN_W[r.category]) flag(`무게가 ${r.category} 치고 너무 가벼움(오인·오분류 확인)`, r, `${r.weight}g`);
  if (r.weight > 0 && MAX_W[r.category] && r.weight > MAX_W[r.category]) flag(`무게가 ${r.category} 치고 너무 무거움(단위·세트 합산 확인)`, r, `${r.weight}g`);

  // weight 숫자
  if (typeof r.weight !== 'number' || Number.isNaN(r.weight) || r.weight < 0) err('weight 숫자 아님/음수', r, String(r.weight));

  // 중복 (groupId, color, size)
  const key = `${r.groupId}|${r.color || ''}|${r.size || ''}`;
  if (!dk.has(key)) dk.set(key, []);
  dk.get(key).push(r);
  // push.js 는 (company,nameKorean|name,color,size) 로도 기존 문서를 찾아 덮어쓴다 → 같은 파일 안에서 groupId 만 다른 같은 이름 행은
  // 하나로 합쳐진다(2026-11 몽벨 시즌 재등록·스노우피크 R/RR 상품번호로 177행이 서로 덮어씀)
  for (const n of [r.nameKorean, r.name]) {
    const nk = `${r.company}|${n}|${r.color || ''}|${r.size || ''}`;
    if (!dn.has(nk)) dn.set(nk, new Set());
    dn.get(nk).add(r.groupId);
  }
}
for (const [key, arr] of dk) for (let i = 1; i < arr.length; i++) err('중복 행 (groupId,color,size)', arr[i], key);
for (const [key, gids] of dn) if (gids.size > 1) flag('같은 이름·색상·사이즈인데 groupId 다름(push 시 한 문서로 합쳐짐)', { groupId: [...gids].join(','), _detailUrl: '' }, key);

// 같은 상품(같은 _detailUrl)의 변형은 같은 groupId
const gidByUrl = new Map();
for (const r of rows) {
  if (!r._detailUrl) continue;
  if (!gidByUrl.has(r._detailUrl)) gidByUrl.set(r._detailUrl, new Set());
  gidByUrl.get(r._detailUrl).add(r.groupId);
}
for (const [u, g] of gidByUrl) if (g.size > 1) err('같은 상품인데 groupId 분리', { groupId: [...g].join(' / ') }, u);

// 멀티브랜드: 한 크롤에 회사가 여럿이면 groupId 접두가 회사별로 달라야 함
const prefixByCompany = new Map();
for (const r of rows) {
  const pre = (r.groupId || '').split('_')[0];
  if (!prefixByCompany.has(r.company)) prefixByCompany.set(r.company, new Set());
  prefixByCompany.get(r.company).add(pre);
}
if (prefixByCompany.size > 1) {
  const seenPre = new Map();
  for (const [c, pres] of prefixByCompany) for (const p of pres) {
    if (seenPre.has(p) && seenPre.get(p) !== c) flag('회사가 다른데 groupId 접두 같음(멀티브랜드 분리 확인)', { groupId: p }, `${seenPre.get(p)} / ${c}`);
    seenPre.set(p, c);
  }
}

// 색상 변형이 여럿인데 이미지가 전부 같음 → 변형별 이미지 미수집 의심
const imgsByGroup = new Map();
for (const r of rows) {
  if (!r.color) continue;
  if (!imgsByGroup.has(r.groupId)) imgsByGroup.set(r.groupId, { colors: new Set(), imgs: new Set() });
  const g = imgsByGroup.get(r.groupId);
  g.colors.add(r.color);
  g.imgs.add(r.imageUrl);
}
for (const [gid, g] of imgsByGroup) if (g.colors.size > 1 && g.imgs.size === 1) flag('색상 여럿인데 이미지 1장(변형별 이미지 확인)', { groupId: gid }, `${g.colors.size}색`);

// push.js는 _source별로 카테고리를 일괄 적용 → 한 _source에 카테고리가 섞이면 덮어써짐
const catBySource = new Map();
for (const r of rows) {
  if (!r._source) continue;
  if (!catBySource.has(r._source)) catBySource.set(r._source, new Set());
  catBySource.get(r._source).add(r.category);
}
for (const [s, c] of catBySource) if (c.size > 1) err('_source 하나에 카테고리 혼재(push 시 덮어씀)', { groupId: s }, [...c].join(','));

// 커버리지(INFO)
const byProd = new Map();
for (const r of rows) {
  if (!byProd.has(idOf(r))) byProd.set(idOf(r), { w: false, img: false, korName: false });
  const p = byProd.get(idOf(r));
  if (r.weight > 0) p.w = true;
  if (r.imageUrl) p.img = true;
  if (hasKorean(r.nameKorean)) p.korName = true;
}
const nProd = byProd.size;
const wRate = [...byProd.values()].filter((p) => p.w).length;
const imgRate = [...byProd.values()].filter((p) => p.img).length;
const korRate = [...byProd.values()].filter((p) => p.korName).length;

// ── 리포트 ──
const line = '─'.repeat(64);
console.log(line);
console.log(`검증: ${path}`);
console.log(`행 ${rows.length} · 상품 ${nProd}`);
console.log(line);
const printBag = (label, bag) => {
  const keys = Object.keys(bag);
  if (!keys.length) {
    console.log(`${label}: 없음 ✓`);
    return 0;
  }
  const total = keys.reduce((s, k) => s + bag[k].count, 0);
  console.log(`${label}: ${keys.length}종 / ${total}건`);
  for (const k of keys.sort((a, b) => bag[b].count - bag[a].count)) {
    console.log(`  • ${k} — ${bag[k].count}건`);
    console.log(`      예: ${bag[k].ex.join(', ')}`);
  }
  return total;
};
const nErr = printBag('❌ ERROR (규칙 위반, 0이어야 함)', errors);
console.log(line);
printBag('⚠️  FLAG (검토 필요 — 사이트가 원래 영문만 주는 등 정당한 예외일 수 있음)', flags);
console.log(line);
console.log('ℹ️  커버리지 (상품 단위):');
console.log(`   무게      ${wRate}/${nProd} (${((wRate / nProd) * 100).toFixed(0)}%)`);
console.log(`   imageUrl  ${imgRate}/${nProd} (${((imgRate / nProd) * 100).toFixed(0)}%)`);
console.log(`   nameKorean 한글 ${korRate}/${nProd} (${((korRate / nProd) * 100).toFixed(0)}%)`);
if (imgRate === 0) console.log('   ⚠️ imageUrl 전부 빈값 — 이미지 셀렉터 확인 필요');
console.log(line);
console.log(nErr === 0 ? '✅ ERROR 0건 — 규칙 통과' : `❌ ERROR ${nErr}건 — 수정 필요`);
process.exit(nErr === 0 ? 0 : 1);

// 파타고니아 (patagonia.co.kr) — 커스텀 한국 이커머스(forbiz enterprise, Naver Cloud 호스팅).
// 리스팅/변형/이미지/영문·한글명은 상품 API, 무게·소재는 상세페이지(goodsView) 서버렌더에서.
//
// ⚠ 상품 리스팅은 JS 렌더라 HTML엔 상품이 없다. POST /controller/product/getGoodslist 가
//    상품 JSON을 준다(id/pname(영문)/pname_kr(한글)/pcode/가격/이미지/options.colors[tooltip=색상명]/sizes).
//    CSRF 필수: goodsList 페이지의 `<script>var forbizCsrf={...hash:"..."}` 해시를 같은 쿠키 세션으로 POST.
// ⚠ 무게: 상세페이지 `/shop/goodsView/{id}` 의 `<h3>무게</h3><p>886g</p>` (Referer 헤더 필요, 봇차단 우회).
// ⚠ 한글화: pname_kr 이 공식 한글명이라 nameKorean 에 그대로. 색상은 tooltip(영문) → colorKorean 음역.
import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';

const BASE = 'https://www.patagonia.co.kr';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const CJ = `/tmp/pat-cj-${process.pid}.txt`;

// 크롤 대상 대분류(루트 코드 = 하위 전체 포함).
// [코드, 라벨, 도메인] — Packs & Gear 를 먼저 처리해 가방/팩이 gear 도메인으로 확정되게 한다
// (키즈 데이팩 등이 뒤의 의류 대분류에서 clothing 으로 덮이지 않도록 dedup 우선순위).
const ALL_ROOTS = [
  ['001003000000000', 'Packs & Gear', 'packs'],
  ['001002000000000', "Men's", 'apparel'],
  ['001001000000000', "Women's", 'apparel'],
  ['001004000000000', "Kids' & Baby", 'apparel'],
];
const ROOTS = process.env.PAT_ROOTS
  ? process.env.PAT_ROOTS.split(',').map((c) => [c, c, c === '001003000000000' ? 'packs' : 'apparel'])
  : ALL_ROOTS;

const curl = (args) => {
  try {
    return execFileSync('/usr/bin/curl', ['-s', '--compressed', '-A', UA, ...args], { maxBuffer: 96 * 1024 * 1024, encoding: 'utf-8' });
  } catch (e) {
    return '';
  }
};

// CSRF 토큰 확보(+쿠키 저장). 실패 시 재시도.
const getCsrf = (cid) => {
  for (let i = 0; i < 4; i++) {
    const html = curl(['-c', CJ, `${BASE}/shop/goodsList/${cid}`]);
    const m = html.match(/forbizCsrf\s*=\s*\{[^}]*hash:"([0-9a-f]+)"/);
    if (m) return m[1];
    execFileSync('sleep', [String(0.5 * (i + 1))]);
  }
  return '';
};

const fetchList = (cid, token) => {
  const out = curl([
    '-b', CJ, '-H', 'X-Requested-With: XMLHttpRequest',
    '--data-urlencode', `ForbizCsrfTestName=${token}`,
    '--data-urlencode', 'page=1', '--data-urlencode', 'max=500',
    '--data-urlencode', 'orderBy=regdateDesc', '--data-urlencode', 'vlevel1=1',
    '--data-urlencode', `filterCid=${cid}`,
    `${BASE}/controller/product/getGoodslist`,
  ]);
  try {
    const j = JSON.parse(out);
    return j?.data?.list || [];
  } catch {
    return [];
  }
};

// 상세페이지에서 무게(g)·소재.
const fetchDetail = (id) => {
  const html = curl(['-e', `${BASE}/`, `${BASE}/shop/goodsView/${id}`]);
  const res = { weight: 0, material: '' };
  if (!html) return res;
  const wm = html.match(/<h3>\s*무게\s*<\/h3>\s*<p>\s*([\d.,]+)\s*g/i);
  if (wm) res.weight = Math.round(parseFloat(wm[1].replace(/,/g, '')));
  else {
    const kg = html.match(/<h3>\s*무게\s*<\/h3>\s*<p>\s*([\d.,]+)\s*kg/i);
    if (kg) res.weight = Math.round(parseFloat(kg[1].replace(/,/g, '')) * 1000);
  }
  const mm = html.match(/제품\s*소재\s*<\/h3>\s*<[^>]*>([\s\S]{0,160}?)<\//i);
  if (mm) {
    const mat = mm[1].replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
    // "상품상세설명 참조" 같은 플레이스홀더는 소재 아님 → 버림.
    if (mat && !/참조|상세설명|상세 ?페이지|아래|below/i.test(mat)) res.material = mat;
  }
  return res;
};

// HTML 엔티티 디코드(API가 &apos; &amp; 등 그대로 준다).
const decode = (s) =>
  (s || '')
    .replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&').trim();

// ── 카테고리: 쿼리한 루트 도메인('packs' vs 'apparel')이 결정적 신호. ──
// 상품별 basicCategoryPath가 들쭉날쭉(키즈 데이팩이 Kids 경로로 뜨는 등)이라 신뢰 불가 →
// getGoodslist 를 어느 대분류로 호출했는지로 도메인을 고정한다.
const classify = (catName, domain, name) => {
  const s = `${catName || ''} ${name}`;
  if (/캠프컵|머그|텀블러|\bcup\b|\bmug\b|tumbler/i.test(s)) return 'cup';
  if (/물병|보틀|bottle|플라스크|flask/i.test(s)) return 'bottle';
  if (/케어 ?제품|왁스|세탁|세제|리페어|repair|care|wash/i.test(s)) return 'etc';
  if (/장갑|glove|미튼|mitten/i.test(name)) return 'gloves';
  if (/게이터|gaiter/i.test(name)) return 'gaiter';
  if (domain === 'packs') {
    // Packs & Gear: 전부 가방/팩류 → 러닝 베스트팩=vest_pack, 나머지 세분.
    if (/베스트|vest/i.test(name)) return 'vest_pack';
    if (/백팩|테크니컬 ?팩|데이팩|backpack|daypack|\bpack\b/i.test(s)) return 'backpack';
    return 'pouch'; // 큐브/MLC/더플/토트/슬링/힙/케이스/파우치 등
  }
  // 의류 영역(Women's/Men's/Kids): 재킷/다운/플리스/셔츠/팬츠/모자 등 전부 clothing
  return 'clothing';
};

// ── 스펙 ──
const volFromName = (name) => {
  const m = name.match(/(\d+(?:\.\d+)?)\s*L\b/);
  return m ? `${m[1]}L` : '';
};
const buildSpecs = (category, name, material) => {
  const s = {};
  if (category === 'backpack') {
    const v = volFromName(name);
    if (v) s.volume = v;
    if (material) s.material = material;
  } else if (category === 'bottle' || category === 'cup') {
    const oz = name.match(/(\d{1,2})\s*oz/i);
    const v = volFromName(name) || (name.match(/(\d{3,4})\s*ml/i) ? `${name.match(/(\d{3,4})\s*ml/i)[1]}ml` : oz ? `${oz[1]}oz` : '');
    if (v) s.capacity = v;
    if (material) s.material = material;
  } else if (category === 'pouch') {
    const v = volFromName(name);
    if (v) s.capacity = v;
    if (material) s.material = material;
  } else if (category === 'clothing') {
    if (material) s.material = material;
    // 이름 기반 스펙(상세 소재가 플레이스홀더라 name에서 추출).
    if (/후디|후드|hoody|hooded|\bhood\b/i.test(name)) s.hasHood = true;
    if (/다운|down|구스|goose/i.test(name)) s.fillMaterial = /구스|goose/i.test(name) ? '구스다운' : '다운';
    if (/고어[- ]?텍스|gore-?tex|하드쉘|hardshell|\b방수\b|waterproof/i.test(name)) s.isWaterproof = true;
    if (/재킷|자켓|jacket|파카|parka|아노락/i.test(name)) s.type = '재킷';
    else if (/베스트|vest/i.test(name)) s.type = '베스트';
    else if (/플리스|fleece/i.test(name)) s.type = '플리스';
    else if (/팬츠|바지|pants|쇼츠|반바지|shorts|레깅스|tights?/i.test(name)) s.type = '하의';
    else if (/셔츠|shirt|티셔츠|\btee\b|후디|스웨트|sweat|헨리|henley|탑\b|top\b/i.test(name)) s.type = '상의';
  } else if (material) {
    s.material = material;
  }
  return s;
};

// ── 색상 한글 음역(대표 색상어) ──
const COLORMAP = {
  black: '블랙', white: '화이트', grey: '그레이', gray: '그레이', navy: '네이비', blue: '블루', red: '레드',
  green: '그린', olive: '올리브', khaki: '카키', beige: '베이지', brown: '브라운', tan: '탄', pink: '핑크',
  purple: '퍼플', yellow: '옐로우', orange: '오렌지', natural: '내추럴', charcoal: '차콜', stone: '스톤',
  forge: '포지', ink: '잉크', smolder: '스몰더', pitch: '피치', new: '뉴', birch: '버치', sedge: '세지',
  may: '메이', berry: '베리', fig: '피그', marble: '마블',
  // 파타고니아 색상/프린트 표기 보강
  mauve: '모브', fuzzy: '퍼지', taupe: '토프', moonrise: '문라이즈', pelican: '펠리컨', heather: '헤더',
  pumice: '퓨미스', stingray: '스팅레이', gravel: '그래블', dried: '드라이드', mango: '망고', oatmeal: '오트밀',
  owlfully: '아울풀리', snowy: '스노위', stonewash: '스톤워시', curious: '큐리어스', seal: '씰', patch: '패치',
  thin: '씬', ice: '아이스', frost: '프로스트', light: '라이트', bunny: '버니', life: '라이프', marigold: '메리골드',
  hopes: '호프스', blooms: '블룸스', solo: '솔로', teal: '틸', lemon: '레몬', zest: '제스트', rock: '록',
  melon: '멜론', silver: '실버', park: '파크', stripe: '스트라이프', logo: '로고', and: '앤', classic: '클래식',
  dark: '다크', wispy: '위스피', vessel: '베슬', nouveau: '누보', shine: '샤인', sound: '사운드', touring: '투어링',
};
const colorToKorean = (en) => {
  const v = (en || '').trim();
  if (!v) return '';
  return v.split(/\s+/).map((w) => COLORMAP[w.toLowerCase()] ?? w).join(' ');
};
const SIZEMAP = { XS: '엑스스몰', S: '스몰', M: '미디엄', L: '라지', XL: '엑스라지', XXL: '더블엑스라지', ALL: '', 'ONE SIZE': '' };
const sizeToKorean = (s) => {
  const v = (s || '').trim().toUpperCase();
  return SIZEMAP[v] ?? s;
};

const slugify = (s) => (s || '').trim().toLowerCase().replace(/\+/g, '-plus').replace(/\s+/g, '-').replace(/[^a-z0-9가-힣-]/g, '');

const buildRows = (p, domain) => {
  const name = decode(p.pname);
  const nameKr = decode(p.pname_kr) || name;
  const category = classify(p.basicCategoryName, domain, name);
  const { weight, material } = fetchDetail(p.id);
  const specs = buildSpecs(category, name, material);
  const groupId = `patagonia_${slugify(name) || p.pcode || p.id}`;
  const opt = p.options || {};
  const colors = opt.colors || [];
  const sizes = (opt.sizes || []).filter((s) => s && !['ALL', 'ONE SIZE'].includes(String(s).toUpperCase()));
  const rowBase = {
    groupId,
    category,
    company: 'patagonia',
    companyKorean: '파타고니아',
    name,
    nameKorean: nameKr,
    weight,
    specs,
    _detailUrl: `${BASE}/shop/goodsView/${p.id}`,
    _source: `${BASE}/shop/goodsView/${p.id}`,
    _handle: p.id,
    _price: (p.sellprice || '').replace(/,/g, ''),
  };
  // ⚠ 색상만 전개하고 사이즈는 접는다(기존 의류 브랜드 관례 = 시에라디자인: 색상별 개별 행, 사이즈 미전개).
  //   색상별로 이미지가 다르고, 사이즈 변형은 이미지·스펙이 동일해 행만 폭발시키므로 대표 1행으로 접는다.
  const rows = [];
  const seen = new Set();
  const colorList = colors.length ? colors : [{ tooltip: '', image: p.image_src }];
  for (const c of colorList) {
    const colorEn = decode(c.tooltip);
    if (seen.has(colorEn)) continue;
    seen.add(colorEn);
    const img = (c.image || c.thumb_images?.[0] || p.image_src || '').replace(/^http:/, 'https:');
    rows.push({
      ...rowBase,
      color: colorEn,
      colorKorean: colorToKorean(colorEn),
      size: '',
      sizeKorean: '',
      imageUrl: img,
    });
  }
  return rows.length ? rows : [{ ...rowBase, color: '', colorKorean: '', size: '', sizeKorean: '', imageUrl: (p.image_src || '').replace(/^http:/, 'https:') }];
};

export { classify, buildSpecs, colorToKorean };

export default {
  name: 'patagonia',
  company: 'patagonia',
  companyKorean: '파타고니아',
  baseUrl: BASE,
  defaultCategories: ['all'],
  crawl: async () => {
    const rows = [];
    const seenId = new Set();
    for (const [cid, label, domain] of ROOTS) {
      const token = getCsrf(cid);
      if (!token) { console.log(`[patagonia] ${label} CSRF 실패, 건너뜀`); continue; }
      const list = fetchList(cid, token);
      console.log(`[patagonia] ${label}: ${list.length}개 상품`);
      for (const p of list) {
        if (seenId.has(p.id)) continue;
        seenId.add(p.id);
        rows.push(...buildRows(p, domain));
        if (seenId.size % 25 === 0) console.log(`[patagonia]   ${seenId.size}개 처리 (누적 ${rows.length}행)`);
      }
    }
    try { unlinkSync(CJ); } catch {}
    // 같은 상품이 다른 id로 여러 대분류에 중복 등재될 수 있다(유니섹스 팩=Packs&Gear+Men's 등).
    // groupId가 같아지므로 (groupId,color,size)로 최종 dedup — 먼저 온 것(=Packs&Gear, gear 분류) 유지.
    const seenRow = new Set();
    const deduped = rows.filter((r) => {
      const k = `${r.groupId}|${r.color}|${r.size}`;
      if (seenRow.has(k)) return false;
      seenRow.add(k);
      return true;
    });
    console.log(`[patagonia] 완료 ${seenId.size}개 상품 / ${deduped.length}행 (중복 ${rows.length - deduped.length} 제거)`);
    return deduped;
  },
};

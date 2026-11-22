// OEL(Outdoor Equipment Lab, 아웃도어장비연구소, oel.co.kr) — 아임웹(imweb) 쇼핑몰. 2026-10 런칭한 국내 신생 백패킹 브랜드.
// ⚠ 상품이 적다(2026-11: NYX 텐트·티타늄 소주잔 2개). 리스팅은 /shop 페이지의 shop_view/?idx=N 링크.
//    /tent·/acc 카테고리 페이지는 상품 카드를 서버렌더하지 않아 /shop만 쓴다. idx 1~45를 직접 조회해 숨김 상품 없음을 확인함.
// ⚠ 상세: 상품명은 영문 모델명만(NYX, Titanium Shot cup). 특징 줄 "· 815g 초경량", "· 40mL" 텍스트에 무게·용량이 있다.
//    상세 정보 표의 "무게" 칸은 배송무게일 수 있다(샷컵 27g인데 "1kg") → 특징 줄의 g 값을 우선.
// ⚠ 한글명·세부 사양(원단·폴·크기)은 상세 설명 "이미지" 안에만 있어 OCR로 확인한 값을 KO_NAME/SPEC_EXTRA에 고정(2026-11).
//    새 상품이 생기면 상세 이미지 OCR(ocr.py) 후 두 맵에 추가할 것.
import { execFileSync } from 'node:child_process';

const BASE = 'https://oel.co.kr';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// 공식 한글명(상세 이미지 OCR). 키 = 사이트 영문 상품명(소문자)
const KO_NAME = {
  nyx: { en: 'NYX Single Wall Tent', ko: '닉스 싱글월 텐트' }, // 이미지: "NYX LIGHTWEIGHT SINGLEWALL TENT", "닉스(NYX)"
  'titanium shot cup': { en: 'Titanium Shot Cup', ko: '티타늄 소주잔' }, // 이미지: "TITANIUM SHOT CUP 티타늄 소주잔"
  'oel canopy 143': { en: 'Canopy 143', ko: '캐노피 143' }, // 초경량 3단 우산(이미지에 한글 상품명 없음 → 음역)
  'foldable cup': { en: 'Foldable Cup', ko: '폴더블 컵' }, // 이미지: "OEL 폴더블 컵"
};
// 상품이 아닌 판매 페이지(행사 참가권 등)
const NOT_PRODUCT = /FIELD MEET/i;
// 이미지 사양표(OCR) — 텍스트에 없는 값
const SPEC_EXTRA = {
  nyx: {
    flyMaterial: '10D Nylon Ripstop SIL/PC coated', // BODY & FLOOR
    poleMaterial: 'DAC NFL 8.7mm',
    pitchType: '자립', // 크로스폴 완전 자립식
  },
  'titanium shot cup': { material: '99% Pure Titanium', isSet: false },
  'oel canopy 143': { material: 'Polyester 75D 210T, Black Pigment Coated (UPF50+)', size: 'Open 90 x 50 cm / Folded 22 x 3.5 cm' },
  'foldable cup': { material: 'Silicone', isSet: false },
};

const curl = (url) => execFileSync('curl', ['-sL', '--compressed', '-A', UA, url], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
const decode = (s) =>
  s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&middot;/g, '·');
const textLines = (html) =>
  decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '\n'))
    .split('\n')
    .map((l) => l.replace(/[\s ]+/g, ' ').trim())
    .filter(Boolean);
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const classify = (name) => {
  const s = name.toLowerCase();
  if (/tent|텐트|nyx/.test(s)) return 'tent';
  if (/tarp|타프/.test(s)) return 'tarp';
  if (/cup|컵|잔|mug/.test(s)) return 'cup';
  if (/canopy|umbrella|우산/.test(s)) return 'etc'; // 우산 — 헬리녹스 엄브렐라와 같은 etc
  return 'etc';
};

const parseDetail = (idx) => {
  const html = curl(`${BASE}/shop_view/?idx=${idx}`);
  if (!html || /<title>페이지 없음/.test(html)) return null;
  const L = textLines(html);
  const title = decode((html.match(/<title>([^<]*)/) || [])[1] || '').replace(/\s*:\s*OEL.*$/, '').trim();
  // 가격 줄(₩) 바로 앞이 상품명
  const pi = L.findIndex((l) => /^₩[\d,]+$/.test(l));
  const siteName = pi > 0 ? L[pi - 1] : title.replace(/^OEL\s+/, '');
  const feats = L.filter((l) => /^·\s*\S/.test(l)).map((l) => l.replace(/^·\s*/, ''));
  const wi = L.indexOf('무게');
  const fieldW = wi >= 0 ? L[wi + 1] : '';
  const img = (html.match(/property="og:image" content="([^"]+)"/) || [])[1] || '';
  return { idx, siteName, title, feats, fieldW, img };
};

const toGram = (v) => {
  const m = String(v).match(/([\d.,]+)\s*(kg|g)\b/i);
  if (!m) return 0;
  const n = parseFloat(m[1].replace(/,/g, ''));
  return m[2].toLowerCase() === 'kg' ? Math.round(n * 1000 * 100) / 100 : n;
};

const buildRow = (d) => {
  const key = d.siteName.toLowerCase();
  const nm = KO_NAME[key] || { en: d.siteName, ko: d.siteName };
  const category = classify(`${nm.en} ${d.title}`);
  // 특징 줄 g 값 우선(상세 정보 "무게" 칸은 배송무게일 수 있음)
  const featW = d.feats.map(toGram).find(Boolean) || 0;
  const weight = featW || toGram(d.fieldW);
  const all = [d.title, ...d.feats].join(' ');
  const specs = {};
  if (category === 'tent' || category === 'tarp') {
    const cap = all.match(/(\d+)\s*인용|(\d+)\s*P\b/);
    if (cap) specs.capacity = cap[1] || cap[2];
    if (/싱글월|single\s*wall/i.test(all)) specs.wallStructure = '싱글월';
    else if (/더블월|double\s*wall/i.test(all)) specs.wallStructure = '더블월';
    const wp = all.match(/내수압\s*([\d,]+)\s*mm/);
    if (wp) specs.waterproofRating = wp[1].replace(/,/g, '');
  } else if (category === 'cup') {
    const ml = all.match(/(\d+)\s*m[lL]\b/);
    if (ml) specs.capacity = ml[1];
  }
  Object.assign(specs, SPEC_EXTRA[key] || {});
  return {
    groupId: `oel_${slug(nm.en)}`,
    category,
    company: 'OEL',
    companyKorean: '오엘',
    name: nm.en,
    nameKorean: nm.ko,
    color: '',
    colorKorean: '',
    size: '',
    sizeKorean: '',
    weight,
    imageUrl: d.img,
    specs,
    _detailUrl: `${BASE}/shop_view/?idx=${d.idx}`,
    _source: `oel_${category}`,
    _siteName: d.siteName,
  };
};

export { parseDetail, buildRow, classify };

export default {
  name: 'oel',
  company: 'OEL',
  companyKorean: '오엘',
  baseUrl: BASE,
  defaultCategories: ['all'],
  crawl: async () => {
    const shop = curl(`${BASE}/shop`);
    const ids = [...new Set([...shop.matchAll(/shop_view\/\?idx=(\d+)/g)].map((m) => m[1]))];
    console.log(`[oel] 리스팅 ${ids.length}개 (idx ${ids.join(', ')})`);
    const rows = [];
    for (const idx of ids) {
      const d = parseDetail(idx);
      if (!d) continue;
      if (NOT_PRODUCT.test(d.siteName)) {
        console.log(`[oel]   제외(상품 아님): ${d.siteName}`);
        continue;
      }
      if (!KO_NAME[d.siteName.toLowerCase()]) console.warn(`[oel] ⚠ 한글명 미등록(상세 이미지 OCR 후 KO_NAME 추가): ${d.siteName}`);
      rows.push(buildRow(d));
      console.log(`[oel]   ${d.siteName}`);
    }
    return rows;
  },
};

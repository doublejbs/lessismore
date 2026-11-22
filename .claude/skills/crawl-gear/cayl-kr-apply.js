#!/usr/bin/env node
// 케일(cayl) 크롤 결과를 현재 룰로 정리하는 후처리. cayl.py 결과(또는 refresh 후보)에 돌린 뒤 normalize-rules.js 를 돌린다.
// 사용: node cayl-kr-apply.js <json> [out-json]   (out 생략 시 덮어씀)
//
// 1) 사이트 제목 "MOAK_모악 (CORDURA)"·"SOBAEK 소백 (b-grid)" → name "Moak (Cordura)" / nameKorean "모악 (코듀라)"
// 2) 원단 괄호 (cayl grid)·(b-grid)·(xpac)·(xpac mesh)·(cordura) → 영문/한글 표기. 브랜드 제거로 남은 "( grid)"도 처리
// 3) 콜라보 "( × BROMPTON)"·"( x QMC)" → " × Brompton" / " × 브롬톤"
// 4) 영문만 있는 의류·모자명 → EN_KO 사전으로 한글 음역(코드·약어 GTD·UL·P.G.·GX 등은 그대로)
// 5) 카테고리 보정: glove→gloves, socks/skirt/booties→clothing, flask→bottle, GTD Vest→vest_pack
//    타브랜드 재판매(BROMPTON 자전거)는 제외(메모 §4)
// 6) 배낭 용량: 상세 "용량 약 25L"·"8~10L 용량"·"(55~57L)"의 상한 → specs.volume (curl, 상품당 1회)
import { readFileSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const EN_KO = {
  moak: '모악', unmun: '운문', sobaek: '소백', seorak: '설악', baekdu: '백두', taebaek: '태백', lumbar: '럼버', pack: '팩',
  messenger: '메신저', tote: '토트', double: '더블', layer: '레이어', cross: '크로스', bag: '백', mari: '마리', roll: '롤',
  top: '탑', vest: '베스트', ultra: '울트라', hipbelt: '힙벨트', belt: '벨트', bottle: '보틀', pouch: '파우치', loft: '로프트',
  down: '다운', jacket: '재킷', light: '라이트', wool: '울', mesh: '메쉬', zip: '집', up: '업', alpha: '알파', cordura: '코듀라',
  shield: '쉴드', insulated: '인슐레이티드', soft: '소프트', wind: '윈드', mountain: '마운틴', parka: '파카', hybrid: '하이브리드',
  reflect: '리플렉트', softshell: '소프트쉘', packable: '패커블', long: '롱', sleeve: '슬리브', snap: '스냅', shirts: '셔츠',
  pullover: '풀오버', merino: '메리노', rib: '립', sound: '사운드', power: '파워', grid: '그리드', powergrid: '파워그리드',
  stripe: '스트라이프', hoody: '후디', pocket: '포켓', delta: '델타', air: '에어', cotna: '코트나', short: '숏', logo: '로고',
  women: '우먼', fuel: '퓨얼', or: '오어', fail: '페일', pants: '팬츠', stretch: '스트레치', shell: '쉘', trail: '트레일',
  cover: '커버', hiking: '하이킹', flap: '플랩', cargo: '카고', winter: '윈터', warm: '웜', camera: '카메라', line: '라인',
  '2way': '투웨이', cap: '캡', micro: '마이크로', hat: '햇', beanie: '비니', silt: '실트', dot: '도트', rain: '레인',
  hood: '후드', ball: '볼', panel: '패널', vent: '벤트', pointed: '포인티드', flow: '플로우', thermal: '써멀', pro: '프로',
  glove: '글러브', blend: '블렌드', socks: '삭스', skirt: '스커트', booties: '부티', flask: '플라스크', locking: '락킹',
  brim: '브림', way: '웨이', subu: '수부', sandal: '샌들', quiver: '퀴버', brompton: '브롬톤',
};
// 원단 괄호 표기 [영문, 한글]
const FABRIC = {
  'cayl grid': ['Grid', '그리드'], grid: ['Grid', '그리드'], 'b-grid': ['B-Grid', 'B-그리드'], xpac: ['X-Pac', '엑스팩'],
  'xpac mesh': ['X-Pac Mesh', '엑스팩 메쉬'], cordura: ['Cordura', '코듀라'],
};
const KEEP = /^(gtd|ul|qmc|gx|wmxs|p\.g\.|s\.b\.|v\d+|sm|ml|\d+[a-z]*|[a-z])$/i;

const titleCase = (s) => s.replace(/[A-Za-z][A-Za-z.'-]*/g, (w) => (KEEP.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()));
const enToKo = (s) =>
  s.replace(/[A-Za-z][A-Za-z.'0-9-]*/g, (w) => {
    const k = w.toLowerCase();
    if (EN_KO[k]) return EN_KO[k];
    if (KEEP.test(w)) return w.toUpperCase();
    return w;
  });

const fetchText = (url) => {
  try {
    return execFileSync('curl', ['-sS', '-m', '30', '-A', UA, url], { maxBuffer: 20e6 }).toString();
  } catch {
    return '';
  }
};
const volCache = new Map();
const volumeOf = (url) => {
  if (volCache.has(url)) return volCache.get(url);
  const t = fetchText(url).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const m = t.match(/용량\s*[:：]?\s*약?\s*(\d+)\s*(?:~\s*(\d+))?\s*L/i) || t.match(/(\d+)\s*(?:~\s*(\d+))?\s*L\s*용량/i) || t.match(/\((\d+)\s*(?:~\s*(\d+))?\s*L\)/i) || t.match(/약\s*(\d+)\s*(?:~\s*(\d+))?\s*L\b/);
  const v = m ? Number(m[2] || m[1]) : 0;
  volCache.set(url, v);
  return v;
};

const parseTitle = (raw) => {
  let t = raw.trim();
  let color = '';
  // "seorak 7 ultra_설악 7 울트라/ light grey" — 말미 "/ 색상"
  const cm = t.match(/^(.*?)\s*\/\s*([a-z][a-z ]+)$/i);
  if (cm && !FABRIC[cm[2].trim().toLowerCase()]) {
    t = cm[1];
    color = cm[2].trim();
  }
  // 말미 "/cayl grid"·"/ xpac" 원단
  let fabric = null;
  const fm = t.match(/^(.*?)\s*\/\s*(cayl grid|b-grid|xpac mesh|xpac|cordura|grid)$/i);
  if (fm) {
    t = fm[1];
    fabric = FABRIC[fm[2].toLowerCase()];
  }
  // 괄호 원단·콜라보
  let collab = '';
  t = t.replace(/\(\s*(?:cayl\s+)?(grid|b-grid|xpac mesh|xpac|cordura)\s*\)/i, (_, f) => {
    fabric = FABRIC[f.toLowerCase()];
    return '';
  });
  t = t.replace(/\(\s*[×x]\s*([A-Za-z]+)\s*\)/i, (_, b) => {
    collab = b;
    return '';
  });
  t = t.replace(/^x\s+([A-Z]+)\s+/, (_, b) => {
    collab = b;
    return '';
  });
  // "MOAK_모악" / "SOBAEK 소백" / "BAEKDU 2 _ 백두 2"
  let en = t;
  let ko = '';
  const km = t.match(/^([A-Za-z][A-Za-z0-9 ]*?)\s*_?\s*([가-힣].*)$/);
  if (km) {
    en = km[1].replace(/_$/, '').trim();
    ko = km[2].trim();
  }
  en = titleCase(en.replace(/_/g, ' ').replace(/\s+/g, ' ').trim());
  if (!ko) ko = enToKo(en);
  const collabEn = collab ? (collab.length <= 3 ? collab.toUpperCase() : collab[0] + collab.slice(1).toLowerCase()) : '';
  const collabKo = collabEn ? (EN_KO[collab.toLowerCase()] || collabEn) : '';
  return {
    name: [en, fabric && `(${fabric[0]})`, collabEn && `× ${collabEn}`].filter(Boolean).join(' '),
    nameKorean: [ko, fabric && `(${fabric[1]})`, collabKo && `× ${collabKo}`].filter(Boolean).join(' '),
    color,
  };
};

const SPECIAL = {
  // "hipbelt (태백2, 백두2 힙벨트) /cayl grid"
  hipbelt: () => ({ name: 'Taebaek 2·Baekdu 2 Hipbelt (Grid)', nameKorean: '태백2·백두2 힙벨트 (그리드)', color: '' }),
};

const main = () => {
  const [inp, outp = inp] = process.argv.slice(2);
  const rows = JSON.parse(readFileSync(inp, 'utf8'));
  const out = [];
  let dropped = 0;
  for (const r0 of rows) {
    const r = { ...r0, specs: { ...(r0.specs || {}) } };
    let title = String(r.nameKorean || '');
    if (r.sizeKorean && title.endsWith(` ${r.sizeKorean}`)) title = title.slice(0, -r.sizeKorean.length - 1);
    if (/brompton\s*x\s*-?\s*g line|speed$/i.test(title)) {
      dropped++;
      continue; // 브롬톤 자전거 — 타브랜드 완제품
    }
    const p = /^hipbelt/i.test(title) ? SPECIAL.hipbelt() : parseTitle(title);
    r.name = p.name;
    r.nameKorean = p.nameKorean;
    if (p.color && !r.color) {
      r.color = titleCase(p.color);
      r.colorKorean = '';
      // 색상이 제목 말미에 붙은 상품("seorak 7 ultra_설악 7 울트라/ black magic")은 색상마다 groupId 가 갈라져 있음 → 통일
      r.groupId = `cayl_${title.replace(/\s*\/\s*[a-z][a-z ]+$/i, '').toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '')}`;
    }
    // 원단 변형(그리드/B-그리드/엑스팩)은 소재 스펙도 그 원단으로
    const fab = r.name.match(/\((B-Grid|Grid|X-Pac Mesh|X-Pac|Cordura)\)/);
    if (fab) r.specs.material = fab[1];
    // 사이트 색상 한글이 영문 그대로 남은 경우(진저·오트밀 등) → 비워서 normalize-rules 색상 사전으로 다시 만든다
    if (/[A-Za-z]/.test(r.colorKorean || '')) r.colorKorean = '';
    if (/^B-Grid /.test(r.color || '')) r.color = r.color.replace(/^B-Grid /, '');
    const n = r.name.toLowerCase();
    if (/glove/.test(n)) r.category = 'gloves';
    else if (/socks|skirt|booties/.test(n)) r.category = 'clothing';
    else if (/flask/.test(n)) {
      r.category = 'bottle';
      const ml = r.name.match(/(\d+)\s*ml/i);
      r.specs = ml ? { capacity: Number(ml[1]) } : {};
      r.name = r.name.replace(/(\d+)\s*ml/i, '$1ml');
      r.nameKorean = r.nameKorean.replace(/(\d+)\s*ML/i, '$1ml');
    } else if (/^gtd vest/.test(n)) r.category = 'vest_pack';
    // 설악(사코슈)·크로스백·메신저 토트는 배낭이 아니라 가방 → pouch(메모 §3 sacoche→pouch)
    else if (/^seorak|cross bag|messenger tote/.test(n)) r.category = 'pouch';
    // 소재 칸에 설명 문장 조각("은 땀이나 물에…", "과 나일론 …입니다.")이 들어온 경우 버림
    if (typeof r.specs.material === 'string' && (/^[은는이가과와에을를의]\s/.test(r.specs.material) || /니다|번짐/.test(r.specs.material))) delete r.specs.material;
    if (r.category === 'pouch') delete r.specs.volume;
    if (['backpack', 'vest_pack'].includes(r.category) && !r.specs.volume) {
      const v = (r.name.match(/vest (\d+)\b/i) || [])[1] || volumeOf(r._detailUrl || r._source);
      if (v) r.specs.volume = Number(v);
    }
    // 사이즈 접미는 normalize-rules 가 다시 붙인다
    out.push(r);
  }
  writeFileSync(outp, JSON.stringify(out, null, 2));
  console.log(`[cayl-kr-apply] ${rows.length}행 → ${out.length}행(타브랜드 제외 ${dropped}) → ${outp}`);
};

main();

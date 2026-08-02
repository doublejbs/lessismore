// Per-category spec schema.
// Stored on Firestore as gear.specs = { ... }.
// Field values: number, string, boolean, or '' (empty string, NOT null).

const SLEEPING_BAG = {
  shape: { label: '형태', type: 'string' },
  fillMaterial: { label: '충전재', type: 'enum', enum: ['down', 'synthetic'] },
  fillWeight: { label: '충전량', unit: 'g', type: 'number' },
  fillPower: { label: '필파워', unit: 'FP', type: 'number' },
  comfortTemp: { label: '편안 온도', unit: '°C', type: 'number' },
  limitTemp: { label: '한계 온도', unit: '°C', type: 'number' },
  zipperSide: { label: '지퍼 방향', type: 'enum', enum: ['left', 'right', 'center'] },
};

const TENT_LIKE = {
  capacity: { label: '수용 인원', unit: '인', type: 'number' },
  wallStructure: { label: '월 구조', type: 'string' },
  shape: { label: '형태', type: 'string' },
  innerMaterial: { label: '이너 소재', type: 'string' },
  flyMaterial: { label: '플라이 소재', type: 'string' },
  poleMaterial: { label: '폴 소재', type: 'string' },
  waterproofRating: { label: '내수압', unit: 'mm', type: 'number' },
  pitchType: { label: '설치 유형', type: 'string' },
  vestibuleArea: { label: '전실 면적', unit: 'm²', type: 'number' },
};

const MAT = {
  type: { label: '타입', type: 'string' },
  shape: { label: '형태', type: 'string' },
  material: { label: '소재', type: 'string' },
  rValue: { label: 'R값', type: 'number' },
  thickness: { label: '두께', unit: 'mm', type: 'number' },
  openSize: { label: '펼쳤을때 크기', type: 'string' },
};

const BACKPACK_LIKE = {
  volume: { label: '용량', unit: 'L', type: 'number' },
  material: { label: '소재', type: 'string' },
  frameType: { label: '프레임 타입', type: 'string' },
  backSystem: { label: '등판 시스템', type: 'string' },
  hasHipBelt: { label: '허리벨트', type: 'boolean' },
  hasShoulderBottlePocket: { label: '숄더 물통 주머니', type: 'boolean' },
  hasRainCover: { label: '레인커버', type: 'boolean' },
  gender: { label: '성별', type: 'enum', enum: ['male', 'female', 'unisex'] },
};

const STOVE_LIKE = {
  material: { label: '소재', type: 'string' },
  fuelType: { label: '연료', type: 'enum', enum: ['gas', 'alcohol', 'wood', 'liquid', 'multi'] },
  output: { label: '화력', unit: 'W', type: 'number' },
  ignition: { label: '점화 방식', type: 'string' },
  hasWindscreen: { label: '윈드스크린 내장', type: 'boolean' },
};

const CUPWARE = {
  material: { label: '소재', type: 'string' },
  capacity: { label: '용량', unit: 'ml', type: 'number' },
  isSet: { label: '세트 구성', type: 'boolean' },
};

const CUTLERY = {
  material: { label: '소재', type: 'string' },
  isSet: { label: '세트 구성', type: 'boolean' },
};

const BOTTLE = {
  material: { label: '소재', type: 'string' },
  capacity: { label: '용량', unit: 'ml', type: 'number' },
  isInsulated: { label: '보온보냉', type: 'boolean' },
  mouthType: { label: '입구 타입', type: 'string' },
};

const CLOTHING = {
  type: { label: '종류', type: 'string' },
  material: { label: '소재', type: 'string' },
  isWaterproof: { label: '방수', type: 'boolean' },
  fillMaterial: { label: '충전재(다운류)', type: 'string' },
  hasHood: { label: '후드', type: 'boolean' },
};

const SUNGLASSES = {
  lensMaterial: { label: '렌즈 소재', type: 'string' },
  uvProtection: { label: 'UV 차단 등급', type: 'string' },
  isPolarized: { label: '편광', type: 'boolean' },
};

const GLOVES = {
  type: { label: '타입', type: 'string' },
  material: { label: '소재', type: 'string' },
  isWaterproof: { label: '방수', type: 'boolean' },
};

const GAITER = {
  height: { label: '높이', unit: 'cm', type: 'number' },
  material: { label: '소재', type: 'string' },
  isWaterproof: { label: '방수', type: 'boolean' },
};

const CHAIR = {
  material: { label: '소재', type: 'string' },
  frameMaterial: { label: '프레임 소재', type: 'string' },
  maxLoad: { label: '최대 하중', unit: 'kg', type: 'number' },
  packedSize: { label: '팩 사이즈', type: 'string' },
};

const TABLE = {
  topMaterial: { label: '상판 소재', type: 'string' },
  frameMaterial: { label: '프레임 소재', type: 'string' },
  maxLoad: { label: '최대 하중', unit: 'kg', type: 'number' },
  packedSize: { label: '팩 사이즈', type: 'string' },
  isHeightAdjustable: { label: '높이 조절', type: 'boolean' },
};

const LIGHTING = {
  type: { label: '타입', type: 'string' },
  maxBrightness: { label: '최대 밝기', unit: 'lm', type: 'number' },
  batteryType: { label: '배터리 타입', type: 'string' },
  waterproofRating: { label: '방수 등급', type: 'string' },
  maxRuntime: { label: '최대 사용시간', unit: 'hr', type: 'number' },
  hasRedMode: { label: '적색광 모드', type: 'boolean' },
};

const TREKKING_POLE = {
  material: { label: '소재', type: 'string' },
  foldType: { label: '접이 방식', type: 'string' },
  lockType: { label: '잠금 방식', type: 'string' },
  minLength: { label: '최소 길이', unit: 'cm', type: 'number' },
  maxLength: { label: '최대 길이', unit: 'cm', type: 'number' },
};

const POUCH_LIKE = {
  material: { label: '소재', type: 'string' },
  isWaterproof: { label: '방수', type: 'boolean' },
  capacity: { label: '용량', unit: 'L', type: 'number' },
};

const GENERIC = {
  material: { label: '소재', type: 'string' },
  size: { label: '사이즈', type: 'string' },
};

export const SPECS_SCHEMA = {
  // 텐트/타프/쉘터
  tent: TENT_LIKE,
  tarp: TENT_LIKE,
  shelter: TENT_LIKE,
  // 침낭
  sleeping_bag: SLEEPING_BAG,
  // 매트
  mat: MAT,
  // 배낭/베스트 배낭
  backpack: BACKPACK_LIKE,
  vest_pack: BACKPACK_LIKE,
  // 버너/토치
  stove: STOVE_LIKE,
  torch: STOVE_LIKE,
  // 식기류
  cup: CUPWARE,
  bowl: CUPWARE,
  cookware_etc: CUPWARE,
  // 수저
  cutlery: CUTLERY,
  // 물통
  bottle: BOTTLE,
  // 의류
  clothing: CLOTHING,
  // 선글라스
  sunglasses: SUNGLASSES,
  // 장갑
  gloves: GLOVES,
  // 게이터
  gaiter: GAITER,
  // 가구
  chair: CHAIR,
  table: TABLE,
  // 조명
  lighting: LIGHTING,
  // 트레킹폴
  trekking_pole: TREKKING_POLE,
  // 파우치/배낭커버
  pouch: POUCH_LIKE,
  backpack_cover: POUCH_LIKE,
  // 소재+사이즈만
  tent_acc: GENERIC,
  pillow: GENERIC,
  food: GENERIC,
  towel: GENERIC,
  hand_warmer: GENERIC,
  shovel: GENERIC,
  hammer: GENERIC,
  microspikes: GENERIC,
  etc: GENERIC,
};

export const CATEGORY_KEYS = Object.keys(SPECS_SCHEMA);

export const CATEGORY_LABELS = {
  backpack: '배낭',
  vest_pack: '베스트 배낭',
  backpack_cover: '배낭 커버',
  tent: '텐트',
  tarp: '타프',
  shelter: '쉘터',
  tent_acc: '텐트ACC',
  sleeping_bag: '침낭',
  mat: '매트',
  pillow: '필로우',
  cup: '컵',
  bowl: '그릇',
  cutlery: '수저',
  stove: '버너',
  torch: '토치',
  bottle: '물통',
  cookware_etc: '식기류 기타',
  chair: '체어',
  table: '테이블',
  clothing: '의류',
  sunglasses: '선글라스',
  gaiter: '스패츠',
  gloves: '장갑',
  lighting: '조명',
  food: '식품',
  towel: '수건',
  pouch: '파우치/수납가방',
  hand_warmer: '핫팩',
  shovel: '삽',
  hammer: '망치',
  microspikes: '아이젠',
  trekking_pole: '트레킹폴',
  etc: '그 외 기타',
};

export const getSpecsFor = (category) => SPECS_SCHEMA[category] ?? {};

export const formatSpecValue = (key, value, schema) => {
  if (value === '' || value == null) return '';
  const def = schema?.[key];
  if (!def) return String(value);
  if (def.type === 'boolean') return value ? '예' : '아니오';
  if (def.unit) return `${value}${def.unit}`;
  return String(value);
};

import GearFilter from '../warehouse/model/GearFilter';

/**
 * 1차 그룹(`GearFilter`) → 세분 카테고리 키 매핑.
 *
 * 크롤 파이프라인(`.claude/skills/crawl-gear/specs-schema.js`의 `CATEGORY_LABELS`)이
 * `gear.category`에 **세분 키**를 저장하는데, 화면의 카테고리 필터는 11개 그룹뿐이다.
 * 매핑 없이 `gear.category === filter`로 비교하면 세분 키를 가진 장비가 어느 그룹에도
 * 걸리지 않아 **목록에서 조용히 사라진다** — 실제로 카탈로그 37,423건 중 2,831건(25종)이
 * 세분 키였고, 공유 배낭에서 장비가 빠져 보이는 원인이었다.
 *
 * 레거시 그룹 키(`furniture`·`lantern` 등) 자신도 멤버로 포함한다(구 데이터 호환).
 *
 * 앱 레포(`lessismore-app`)의 `model/gear/GearCategoryGroups.ts`와 **같은 매핑**이다.
 * 한쪽만 고치면 같은 배낭이 앱과 웹에서 다르게 묶인다.
 */
const GROUP_MEMBERS: Partial<Record<GearFilter, string[]>> = {
  [GearFilter.Tent]: ['tent', 'tarp', 'shelter', 'tent_acc'],
  [GearFilter.SleepingBag]: ['sleeping_bag'],
  [GearFilter.Mat]: ['mat', 'pillow'],
  [GearFilter.Backpack]: ['backpack', 'vest_pack', 'backpack_cover', 'pouch'],
  [GearFilter.Clothing]: ['clothing', 'gloves', 'gaiter', 'sunglasses'],
  [GearFilter.Furniture]: ['furniture', 'chair', 'table'],
  [GearFilter.Lantern]: ['lantern', 'lighting'],
  [GearFilter.Cooking]: [
    'cooking',
    'stove',
    'torch',
    'cup',
    'bowl',
    'cookware_etc',
    'cutlery',
    'bottle',
  ],
  [GearFilter.Electronic]: ['electronic'],
  [GearFilter.Food]: ['food'],
  [GearFilter.Etc]: [
    'etc',
    'towel',
    'hand_warmer',
    'shovel',
    'hammer',
    'microspikes',
    'trekking_pole',
  ],
};

// 세분 카테고리 → 그룹 역매핑 (모듈 로드 시 1회 구성).
const CATEGORY_TO_GROUP: Record<string, GearFilter> = Object.entries(
  GROUP_MEMBERS
).reduce<Record<string, GearFilter>>((acc, [group, members]) => {
  members.forEach((member) => {
    acc[member] = group as GearFilter;
  });

  return acc;
}, {});

/**
 * 세분 카테고리 키를 1차 그룹으로 매핑한다.
 *
 * **미지의 키는 `기타`로 떨어뜨린다** — 새 세분 키가 추가돼도 장비가 목록에서
 * 사라지지 않게 하기 위해서다. 매핑을 갱신하기 전까지는 `기타`에 모인다.
 */
export const getGroupForCategory = (category: string): GearFilter => {
  return CATEGORY_TO_GROUP[category] ?? GearFilter.Etc;
};

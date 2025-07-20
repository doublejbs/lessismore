import GearFilter from '../warehouse/model/GearFilter';

export const getKoreanCategoryName = (category: string): string => {
  switch (category) {
    case GearFilter.Tent:
      return '텐트';
    case GearFilter.SleepingBag:
      return '침낭';
    case GearFilter.Backpack:
      return '배낭';
    case GearFilter.Clothing:
      return '의류';
    case GearFilter.Mat:
      return '매트';
    case GearFilter.Furniture:
      return '가구';
    case GearFilter.Lantern:
      return '랜턴';
    case GearFilter.Cooking:
      return '조리';
    case GearFilter.Etc:
      return '기타';
    case '베이스':
      return '베이스';
    case '베이스(배낭, 텐트, 침낭, 매트)':
      return '베이스(배낭, 텐트, 침낭, 매트)';
    default:
      return category;
  }
};

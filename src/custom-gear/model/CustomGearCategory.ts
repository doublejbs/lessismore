import GearFilter from '../../warehouse/model/GearFilter.ts';
import WarehouseFilter from '../../warehouse/model/WarehouseFilter.ts';

class CustomGearCategory {
  public static new() {
    return new CustomGearCategory();
  }

  private readonly filters: WarehouseFilter[] = [
    {
      filter: GearFilter.Tent,
      name: '텐트',
    },
    {
      filter: GearFilter.SleepingBag,
      name: '침낭',
    },
    {
      filter: GearFilter.Backpack,
      name: '배낭',
    },
    {
      filter: GearFilter.Clothing,
      name: '의류',
    },
    {
      filter: GearFilter.Mat,
      name: '매트',
    },
    {
      filter: GearFilter.Furniture,
      name: '가구',
    },
    {
      filter: GearFilter.Lantern,
      name: '랜턴',
    },
    {
      filter: GearFilter.Cooking,
      name: '조리',
    },
    {
      filter: GearFilter.Electronic,
      name: '전자기기',
    },
    {
      filter: GearFilter.Food,
      name: '음식',
    },
    {
      filter: GearFilter.Etc,
      name: '기타',
    },
  ].map(({ filter, name }) => WarehouseFilter.from(filter, name));

  private constructor() {}

  public mapFilters<R>(callback: (filter: WarehouseFilter) => R) {
    return this.filters.map(callback);
  }

  public selectFilter(filter: WarehouseFilter) {
    this.filters.forEach((currentFilter) => {
      if (currentFilter === filter) {
        currentFilter.select();
      } else {
        currentFilter.deselect();
      }
    });
  }

  public getSelectedFilter() {
    return (
      this.filters.find((filter) => filter.isSelected())?.getFilter() ??
      GearFilter.All
    );
  }

  public getSelectedFirstCategory() {
    const selectedFilter = this.getSelectedFilter();

    switch (selectedFilter) {
      case GearFilter.Tent:
      case GearFilter.SleepingBag:
      case GearFilter.Backpack:
      case GearFilter.Mat: {
        return 'big4';
      }
      default: {
        return selectedFilter;
      }
    }
  }

  public selectFirst() {
    this.selectFilter(this.filters[0]);
    return this;
  }

  public clear() {
    this.selectFirst();
  }

  public selectFilterWith(gearFilter: GearFilter) {
    this.selectFilter(
      this.filters.find((filter) => filter.getFilter() === gearFilter) ??
        this.filters[0]
    );
  }
}

export default CustomGearCategory;

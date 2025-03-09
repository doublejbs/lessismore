import WarehouseFilter from './WarehouseFilter';
import GearFilter from './GearFilter';

class WarehouseFilters {
  public static new() {
    return new WarehouseFilters();
  }

  private readonly filters: WarehouseFilter[] = [
    {
      filter: GearFilter.All,
      name: '전체',
    },
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
      filter: GearFilter.Etc,
      name: '기타',
    },
  ].map(({ filter, name }) => WarehouseFilter.from(filter, name));

  private constructor() {}

  public mapFilters<R>(callback: (filter: WarehouseFilter) => R) {
    return this.filters.map(callback);
  }

  public selectFilterWith(filter: GearFilter) {
    this.filters.forEach((currentFilter) => {
      if (currentFilter.isSame(filter)) {
        currentFilter.select();
      } else {
        currentFilter.deselect();
      }
    });
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
}

export default WarehouseFilters;

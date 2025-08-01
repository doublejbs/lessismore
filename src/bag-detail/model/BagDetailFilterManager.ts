import { makeAutoObservable } from 'mobx';
import Gear from '../../model/Gear';
import GearFilter from '../../warehouse/model/GearFilter';
import WarehouseFilter from '../../warehouse/model/WarehouseFilter';

class BagDetailFilterManager {
  public static from() {
    return new BagDetailFilterManager();
  }

  private readonly filters: WarehouseFilter[] = [
    {
      filter: GearFilter.Backpack,
      name: '배낭',
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
      filter: GearFilter.Mat,
      name: '매트',
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
      filter: GearFilter.Clothing,
      name: '의류',
    },
    {
      filter: GearFilter.Furniture,
      name: '가구',
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

  private constructor() {
    makeAutoObservable(this);
  }

  public mapFilters<R>(callback: (filter: WarehouseFilter) => R) {
    return this.filters.map(callback);
  }

  public toggleFilter(filter: WarehouseFilter) {
    if (filter.isSelected()) {
      filter.deselect();
    } else {
      filter.select();
    }
  }

  public hasFilter(filter: GearFilter) {
    return this.filters.some((f) => f.isSame(filter));
  }

  public selectFilter(filter: WarehouseFilter) {
    filter.select();
  }

  public deselectFilter(filter: WarehouseFilter) {
    filter.deselect();
  }

  public groupGearsByCategory(gears: Gear[]) {
    return this.filters
      .map((filter) => ({
        category: filter,
        gears: gears.filter((gear) => gear.getCategory() === filter.getFilter())
      }))
      .filter(({ gears }) => gears.length > 0);
  }

  public getCategoryName(category: GearFilter): string {
    const filter = this.filters.find((f) => f.isSame(category));
    return filter?.getName() || '기타';
  }

  public getFiltersWithGears(gears: Gear[]) {
    return this.filters.filter((filter) => 
      gears.some((gear) => gear.getCategory() === filter.getFilter())
    );
  }
}

export default BagDetailFilterManager;
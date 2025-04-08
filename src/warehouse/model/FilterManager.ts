import GearFilter from './GearFilter';
import WarehouseFilter from './WarehouseFilter';
import { makeAutoObservable } from 'mobx';
import Gear from '../../model/Gear';

class FilterManager {
  public static from() {
    return new FilterManager();
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

  private constructor() {
    makeAutoObservable(this);
    this.selectAllFilter();
  }

  public initializeWithSelectedGears(selectedGears: Gear[]) {
    selectedGears.forEach((gear) => {
      this.filters
        .find((currentFilter) => currentFilter.getFilter() === gear.getSubCategory())
        ?.plusCount();
    });
  }

  public getFilters() {
    return this.filters;
  }

  private selectAllFilter() {
    this.filters.forEach((currentFilter) => {
      if (currentFilter.getFilter() === GearFilter.All) {
        currentFilter.select();
      } else {
        currentFilter.deselect();
      }
    });
  }

  public getSelectedFilters() {
    return this.filters.filter((filter) => filter.isSelected()).map((filter) => filter.getFilter());
  }

  public isAllFilterSelected() {
    return this.filters[0].isSelected();
  }

  public selectFilter(filter: WarehouseFilter) {
    if (filter.isSame(GearFilter.All)) {
      this.selectAllFilter();
    } else {
      this.filters.find((currentFilter) => currentFilter.isSame(GearFilter.All))?.deselect();
      filter.select();
    }
  }

  public deselectFilter(filter: WarehouseFilter) {
    filter.deselect();

    if (this.getSelectedFilters().length === 0) {
      this.selectAllFilter();
    }
  }

  public mapFilters<R>(callback: (filter: WarehouseFilter) => R) {
    return this.filters.map(callback);
  }

  public hasFilter(filter: GearFilter) {
    if (this.isAllFilterSelected()) {
      return true;
    } else {
      return this.getSelectedFilters().some((currentFilter) => currentFilter === filter);
    }
  }
}

export default FilterManager;

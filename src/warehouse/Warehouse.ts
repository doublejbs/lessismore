import { makeAutoObservable } from 'mobx';
import app from '../App';
import GearStore from '../firebase/GearStore';
import Gear from '../model/Gear';
import GearFilter from './GearFilter';
import WarehouseFilter from './WarehouseFilter.ts';

class Warehouse {
  public static new() {
    return new Warehouse(app.getGearStore());
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
  private gears: Gear[] = [];

  private constructor(private readonly gearStore: GearStore) {
    makeAutoObservable(this);
    this.filters[0].select();
  }

  public async getList() {
    this.setGears(await this.gearStore.getList(this.getSelectedFilter()));
  }

  public async remove(value: Gear) {
    await this.gearStore.remove(value);
    await this.getList();
  }

  private setGears(value: Gear[]) {
    this.gears = value;
  }

  public getGears() {
    return this.gears;
  }

  public edit(gear: Gear) {}

  public mapFilters<R>(callback: (filter: WarehouseFilter) => R) {
    return this.filters.map(callback);
  }

  public async selectFilter(filter: WarehouseFilter) {
    this.filters.forEach((currentFilter) => {
      if (currentFilter === filter) {
        currentFilter.select();
      } else {
        currentFilter.deselect();
      }
    });
    await this.getList();
  }

  private getSelectedFilter() {
    return (
      this.filters.find((filter) => filter.isSelected())?.getFilter() ??
      GearFilter.All
    );
  }

  public async updateGear(gear: Gear) {
    this.setGears(
      this.gears.map((currentGear) => {
        if (currentGear.isSame(gear)) {
          return gear;
        } else {
          return currentGear;
        }
      })
    );
  }
}

export default Warehouse;

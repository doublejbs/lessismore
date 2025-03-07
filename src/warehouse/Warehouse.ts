import { makeAutoObservable, observable } from 'mobx';
import app from '../App';
import GearStore from '../firebase/GearStore';
import Gear from '../search-warehouse/Gear';
import GearFilter from './GearFilter';

class Warehouse {
  public static new() {
    return new Warehouse(app.getGearStore());
  }

  private readonly filters: GearFilter[] = [
    GearFilter.All,
    GearFilter.Tent,
    GearFilter.SleepingBag,
    GearFilter.Backpack,
    GearFilter.Clothing,
    GearFilter.Mat,
    GearFilter.Furniture,
    GearFilter.Lantern,
    GearFilter.Cooking,
    GearFilter.Etc,
  ];
  private gears: Gear[] = [];
  private selectedFilter: GearFilter = GearFilter.All;

  private constructor(private readonly gearStore: GearStore) {
    makeAutoObservable(this);
  }

  public async getList() {
    this.setGears(await this.gearStore.getList());
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

  public setSelectedFilter(value: GearFilter) {
    this.selectedFilter = value;
  }

  public mapFilters<R>(callback: (filter: GearFilter) => R) {
    return this.filters.map(callback);
  }
}

export default Warehouse;

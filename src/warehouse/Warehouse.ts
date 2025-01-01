import { makeAutoObservable } from 'mobx';
import app from '../App';
import GearStore from '../firebase/GearStore';
import Gear from './search-warehouse/Gear';

class Warehouse {
  public static new() {
    return new Warehouse(app.getGearStore());
  }

  private gears: Gear[] = [];
  private searchVisible = false;
  private customVisible = false;

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

  public hasGear(value: Gear) {
    return this.gears.some((gear) => gear.getId() === value.getId());
  }

  public showSearch() {
    this.setSearchVisible(true);
  }

  public hideSearch() {
    this.setSearchVisible(false);
  }

  private setSearchVisible(value: boolean) {
    this.searchVisible = value;
  }

  public shouldShowSearch() {
    return this.searchVisible;
  }

  public showCustom() {
    this.setCustomVisible(true);
  }

  public hideCustom() {
    this.setCustomVisible(false);
  }

  private setCustomVisible(value: boolean) {
    this.customVisible = value;
  }

  public shouldShowCustom() {
    return this.customVisible;
  }
}

export default Warehouse;

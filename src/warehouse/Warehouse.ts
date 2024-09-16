import { makeAutoObservable } from 'mobx';
import app from '../App';
import GearStore from '../firebase/GearStore';
import Gear from './search-warehouse/Gear';

class Warehouse {
  public static new() {
    return new Warehouse(app.getGearStore());
  }

  private gears: Gear[] = [];

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
}

export default Warehouse;

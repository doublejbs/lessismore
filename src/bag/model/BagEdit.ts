import { makeAutoObservable } from 'mobx';
import app from '../../App';
import Gear from '../../model/Gear';
import BagStore from '../../firebase/BagStore';

class BagEdit {
  public static from(id: string) {
    return new BagEdit(id, app.getBagStore());
  }

  private name: string = '';
  private weight: string = '';
  private gears: Gear[] = [];
  private warehouseVisible = false;
  private searchVisible = false;
  private initialized = false;

  private constructor(
    private readonly id: string,
    private readonly bagStore: BagStore
  ) {
    makeAutoObservable(this);
  }

  public async initialize() {
    const { name, weight, gears } = await this.bagStore.getBag(this.id);
    this.setName(name);
    this.setWeight(weight);
    this.setGears(gears);
    this.setInitialized(true);
  }

  private setName(value: string) {
    this.name = value;
  }

  public getName() {
    return this.name;
  }

  private setWeight(value: string) {
    this.weight = value;
  }

  public getWeight() {
    return Number(this.weight) / 1000;
  }

  private setGears(value: Gear[]) {
    this.gears = value;
  }

  public getGears() {
    return this.gears;
  }

  public async addGear(gear: Gear) {
    await this.bagStore.addGear(this.id, gear);
    await this.initialize();
  }

  public async removeGear(gear: Gear) {
    await this.bagStore.removeGear(this.id, gear);
    await this.initialize();
  }

  public hasGear(gear: Gear) {
    return this.gears.some((g) => g.isSame(gear));
  }

  public hasGearWith(id: string) {
    return this.gears.some((gear) => gear.hasId(id));
  }

  public showWarehouse() {
    this.warehouseVisible = true;
    this.searchVisible = false;
  }

  public showSearch() {
    this.warehouseVisible = false;
    this.searchVisible = true;
  }

  public hideWarehouse() {
    this.warehouseVisible = false;
    this.searchVisible = false;
  }

  public hideSearch() {
    this.warehouseVisible = false;
    this.searchVisible = false;
  }

  public shouldShowWarehouse() {
    return this.warehouseVisible;
  }

  public shouldShowSearch() {
    return this.searchVisible;
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  public isInitialized() {
    return this.initialized;
  }
}

export default BagEdit;

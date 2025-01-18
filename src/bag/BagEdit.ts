import BagStore from '../firebase/BagStore.ts';
import app from '../App.ts';
import { makeAutoObservable } from 'mobx';
import Gear from '../search-warehouse/Gear';

class BagEdit {
  public static from(id: string) {
    return new BagEdit(id, app.getBagStore());
  }

  private name: string = '';
  private weight: string = '';
  private gears: Gear[] = [];

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
}

export default BagEdit;

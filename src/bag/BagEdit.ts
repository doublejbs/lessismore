import BagStore from '../firebase/BagStore.ts';
import app from '../App.ts';
import { makeAutoObservable } from 'mobx';
import Gear from '../warehouse/search-warehouse/Gear.ts';

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
    return this.weight;
  }

  private setGears(value: Gear[]) {
    this.gears = value;
  }

  public getGears() {
    return this.gears;
  }
}

export default BagEdit;

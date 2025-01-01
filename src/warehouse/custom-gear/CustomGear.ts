import { makeAutoObservable } from 'mobx';
import GearStore from '../../firebase/GearStore.ts';
import app from '../../App.ts';
import Gear from '../search-warehouse/Gear.ts';

class CustomGear {
  public static new() {
    return new CustomGear(app.getGearStore());
  }

  private name = '';
  private company = '';
  private weight = 0;

  private constructor(private readonly gearStore: GearStore) {
    makeAutoObservable(this);
  }

  public setName(value: string) {
    this.name = value;
  }

  public setCompany(value: string) {
    this.company = value;
  }

  public setWeight(value: number) {
    this.weight = value;
  }

  public getName() {
    return this.name;
  }

  public getCompany() {
    return this.company;
  }

  public getWeight() {
    return this.weight;
  }

  public async register() {
    if (!this.validate()) {
      return;
    }

    await this.gearStore.register([
      new Gear(
        `${this.name}${this.company}`,
        this.name,
        this.company,
        String(this.weight),
        ''
      ),
    ]);
  }

  private validate() {
    return !!this.name && !!this.company;
  }
}

export default CustomGear;

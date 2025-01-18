import { makeAutoObservable } from 'mobx';
import Gear from './Gear';
import app from '../App';
import GearStore from '../firebase/GearStore';

class SearchWarehouse {
  public static new() {
    return new SearchWarehouse(app.getGearStore());
  }

  private keyword: string = '';
  private result: Array<Gear> = [];

  private constructor(private readonly gearStore: GearStore) {
    makeAutoObservable(this);
  }

  public async getAll() {
    this.setResult(await this.gearStore.searchAll());
  }

  public async search(keyword: string) {
    this.setKeyword(keyword.trim());

    if (this.keyword) {
      this.setResult(await this.gearStore.searchList(this.keyword));
    } else {
      this.setResult(await this.gearStore.searchAll());
    }
  }

  public async register(value: Array<Gear>) {
    await this.gearStore.register(value);
  }

  public setKeyword(value: string) {
    this.keyword = value;
  }

  private setResult(value: Array<Gear>) {
    this.result = value;
  }

  public getResult() {
    return this.result;
  }

  public async select(value: Gear) {
    await this.register([value]);
    await this.search(this.keyword);
  }

  public async deselect(value: Gear) {
    await this.gearStore.remove(value);
    await this.search(this.keyword);
  }
}

export default SearchWarehouse;

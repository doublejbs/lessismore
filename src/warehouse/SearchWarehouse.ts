import { makeAutoObservable, makeObservable, observable } from 'mobx';
import app from '../App';
import GearStore from '../firebase/GearStore';
import GearType from './type/GearType';

class SearchWarehouse {
  public static new() {
    return new SearchWarehouse(app.getGearStore());
  }

  private keyword: string = '';
  private result: Array<GearType> = [];

  private constructor(private readonly gearStore: GearStore) {
    makeAutoObservable(this);
  }

  public async getAll() {
    this.setResult(await this.gearStore.getAll());
  }

  public async search(keyword: string) {
    this.setKeyword(keyword.trim());

    if (this.keyword) {
      this.setResult(await this.gearStore.searchList(this.keyword));
    } else {
      this.setResult(await this.gearStore.getAll());
    }
  }

  public setKeyword(value: string) {
    this.keyword = value;
  }

  private setResult(value: Array<GearType>) {
    this.result = value;
  }

  public getResult() {
    return this.result;
  }
}

export default SearchWarehouse;

import { makeAutoObservable, makeObservable, observable } from 'mobx';
import app from '../../App';
import GearStore from '../../firebase/GearStore';
import Gear from './Gear';

class SearchWarehouse {
  public static new() {
    return new SearchWarehouse(app.getGearStore());
  }

  private selected: Array<Gear> = [];
  private keyword: string = '';
  private result: Array<Gear> = [];

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

  public async register() {
    if (!!this.selected.length) {
      await this.gearStore.register(this.selected);
    }
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

  public select(value: Gear) {
    this.selected.push(value);
  }

  public deselect(value: Gear) {
    this.setSelected(
      this.selected.filter((item) => {
        return item.isSame(value);
      })
    );
  }

  public isSelected(value: Gear) {
    return this.selected.some((item) => {
      return item.isSame(value);
    });
  }

  private setSelected(value: Gear[]) {
    this.selected = value;
  }
}

export default SearchWarehouse;

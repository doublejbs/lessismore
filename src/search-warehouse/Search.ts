import Gear from './Gear';
import GearStore from '../firebase/GearStore';
import { action, makeObservable, observable } from 'mobx';

abstract class Search {
  @observable private keyword: string = '';
  @observable private result: Array<Gear> = [];

  protected constructor(private readonly gearStore: GearStore) {
    makeObservable(this);
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

  protected async remove(gear: Gear) {
    await this.gearStore.remove(gear);
  }

  @action
  public setKeyword(value: string) {
    this.keyword = value;
  }

  @action
  private setResult(value: Array<Gear>) {
    this.result = value;
  }

  public getResult() {
    return this.result;
  }

  protected getKeyword() {
    return this.keyword;
  }
}

export default Search;

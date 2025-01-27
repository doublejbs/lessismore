import Gear from './Gear';
import GearStore from '../firebase/GearStore';
import { action, makeObservable, observable } from 'mobx';

abstract class Search {
  @observable private keyword: string = '';
  @observable private result: Array<Gear> = [];

  protected constructor() {
    makeObservable(this);
  }

  public abstract select(gear: Gear): Promise<void>;
  public abstract deselect(gear: Gear): Promise<void>;
  public abstract searchList(keyword: string): Promise<Gear[]>;
  public abstract searchAll(): Promise<Gear[]>;

  public async getAll() {
    this.setResult(await this.searchAll());
  }

  public async search(keyword: string) {
    this.setKeyword(keyword.trim());

    if (this.keyword) {
      this.setResult(await this.searchList(keyword));
    } else {
      this.setResult(await this.searchAll());
    }
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

  protected async refresh() {
    await this.search(this.getKeyword());
  }
}

export default Search;

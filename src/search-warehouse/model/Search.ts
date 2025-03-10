import Gear from '../../model/Gear';
import GearStore from '../../firebase/GearStore';
import { action, makeObservable, observable } from 'mobx';

abstract class Search {
  @observable private keyword: string = '';
  @observable private result: Array<Gear> = [];
  @observable private loading = false;

  protected constructor() {
    makeObservable(this);
  }

  public abstract select(gear: Gear): Promise<void>;
  public abstract deselect(gear: Gear): Promise<void>;
  public abstract searchList(keyword: string): Promise<Gear[]>;
  public abstract searchAll(): Promise<Gear[]>;
  public abstract searchAllMore(): Promise<Gear[]>;
  public abstract searchListMore(keyword: string): Promise<Gear[]>;

  public async search(keyword: string) {
    this.setLoading(true);
    this.setKeyword(keyword.trim());

    if (this.keyword) {
      this.setResult(await this.searchList(keyword));
    } else {
      this.setResult(await this.searchAll());
    }
    this.setLoading(false);
  }

  public async searchMore() {
    this.setLoading(true);
    if (this.keyword) {
      this.appendResult(await this.searchListMore(this.keyword));
    } else {
      this.appendResult(await this.searchAllMore());
    }
    this.setLoading(false);
  }

  private appendResult(value: Array<Gear>) {
    this.result.push(...value);
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

  @action
  private setLoading(value: boolean) {
    this.loading = value;
  }

  public isLoading() {
    return this.loading;
  }
}

export default Search;

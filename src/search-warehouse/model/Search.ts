import Gear from '../../model/Gear';
import { action, makeObservable, observable } from 'mobx';

abstract class Search {
  @observable private keyword: string = '';
  @observable private result: Array<Gear> = [];
  @observable private loading = false;
  @observable private hasMore = false;

  protected constructor() {
    makeObservable(this);
  }

  public abstract select(gear: Gear): Promise<void>;
  public abstract deselect(gear: Gear): Promise<void>;
  public abstract searchList(
    keyword: string
  ): Promise<{ gears: Gear[]; hasMore: boolean }>;
  public abstract searchListMore(
    keyword: string
  ): Promise<{ gears: Gear[]; hasMore: boolean }>;

  public async search(keyword: string) {
    this.setLoading(true);
    this.setKeyword(keyword.trim());

    if (this.keyword) {
      const { gears, hasMore } = await this.searchList(keyword);

      this.setResult(gears);
      this.setHasMore(hasMore);
    } else {
      this.setResult([]);
    }
    this.setLoading(false);
  }

  public async searchMore() {
    if (this.hasMore) {
      this.setLoading(true);
      if (this.keyword) {
        const { gears, hasMore } = await this.searchListMore(this.keyword);
        this.appendResult(gears);
        this.setHasMore(hasMore);
      } else {
        this.appendResult([]);
      }
      this.setLoading(false);
    }
  }

  @action
  private appendResult(value: Array<Gear>) {
    this.result.push(...value);
  }

  @action
  private setKeyword(value: string) {
    this.keyword = value;
  }

  @action
  private setResult(value: Array<Gear>) {
    this.result = value;
  }

  public getResult() {
    return this.result;
  }

  public getKeyword() {
    return this.keyword;
  }

  @action
  private setLoading(value: boolean) {
    this.loading = value;
  }

  public isLoading() {
    return this.loading;
  }

  public isEmpty() {
    return !this.result.length;
  }

  @action
  private setHasMore(value: boolean) {
    this.hasMore = value;
  }

  public canLoadMore() {
    return this.hasMore;
  }
}

export default Search;

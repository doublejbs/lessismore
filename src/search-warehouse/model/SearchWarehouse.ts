import Gear from '../../model/Gear';
import { action, makeObservable, observable } from 'mobx';
import SearchDispatcherType from './SearchDispatcherType';
import SearchDispatcher from './SearchDispatcher';

class SearchWarehouse {
  public static new() {
    return new SearchWarehouse(SearchDispatcher.new());
  }

  @observable private keyword: string = '';
  @observable private result: Array<Gear> = [];
  @observable private loading = false;
  @observable private hasMore = false;
  private page = 0;

  protected constructor(
    private readonly searchDispatcher: SearchDispatcherType
  ) {
    makeObservable(this);
  }

  public async deselect(gear: Gear) {
    await this.searchDispatcher.remove(gear);
    await this.search(this.getKeyword());
  }

  public async select(gear: Gear) {
    await this.searchDispatcher.register([gear]);
    await this.search(this.getKeyword());
  }

  public async search(keyword: string) {
    this.clearPage();
    this.setKeyword(keyword.trim());
    this.setResult([]);
    await this.executeSearch();
  }

  public async searchMore() {
    if (this.hasMore) {
      await this.executeSearch();
    }
  }

  private async executeSearch() {
    this.setLoading(true);

    if (this.keyword) {
      const { gears, hasMore } = await this.searchDispatcher.searchList(
        this.getKeyword(),
        this.plusPage()
      );

      this.appendResult(gears);
      this.setHasMore(hasMore);
    } else {
      this.setResult([]);
    }
    this.setLoading(false);
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

  private clearPage() {
    this.page = 0;
  }

  private plusPage() {
    return this.page++;
  }
}

export default SearchWarehouse;

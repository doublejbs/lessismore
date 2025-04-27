import Gear from '../../model/Gear';
import { action, makeObservable, observable } from 'mobx';
import SearchDispatcherType from './SearchDispatcherType';
import SearchDispatcher from './SearchDispatcher';
import { debounce } from 'lodash';
import ToastManager from '../../toast/ToastManager';
import app from '../../App';
import { Location, NavigateFunction } from 'react-router-dom';
import Firebase from '../../firebase/Firebase';
import AlertManager from '../../alert/AlertManager';

class SearchWarehouse {
  public static new(navigate: NavigateFunction, location: Location) {
    return new SearchWarehouse(
      SearchDispatcher.new(),
      app.getToastManager(),
      navigate,
      location,
      app.getFirebase(),
      app.getAlertManager()
    );
  }

  @observable private keyword: string = '';
  @observable private result: Array<Gear> = [];
  @observable private selected: Array<Gear> = [];
  @observable private loading = false;
  @observable private hasMore = false;
  private page = 0;
  private readonly debouncedSearch = debounce(this.executeSearch, 300).bind(this);

  protected constructor(
    private readonly searchDispatcher: SearchDispatcherType,
    private readonly toastManager: ToastManager,
    private readonly navigate: NavigateFunction,
    private readonly location: Location,
    private readonly firebase: Firebase,
    private readonly alertManager: AlertManager
  ) {
    makeObservable(this);
  }

  public changeKeyword(keyword: string) {
    this.setLoading(true);
    this.setKeyword(keyword);
    this.debouncedSearch();
  }

  @action
  public toggle(gear: Gear) {
    if (this.isSelected(gear)) {
      this.deleteSelected(gear);
    } else {
      this.select(gear);
    }
  }

  private select(gear: Gear) {
    if (this.firebase.isLoggedIn()) {
      this.selected.push(gear);
    } else {
      this.alertManager.show({
        message: '로그인 후 추가 가능해요.',
        confirmText: '로그인 하러 가기',
        onConfirm: async () => {
          this.navigate('/login');
        },
      });
    }
  }

  private deselect(gear: Gear) {
    this.selected = this.selected.filter((item) => !item.isSame(gear));
  }

  @action
  public deleteSelected(gear: Gear) {
    this.selected = this.selected.filter((item) => !item.isSame(gear));
  }

  public isSelected(gear: Gear) {
    return this.selected.some((item) => item.isSame(gear));
  }

  public async searchMore() {
    if (this.hasMore) {
      this.setLoading(true);

      if (this.getKeyword()) {
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
  }

  private async executeSearch() {
    this.setLoading(true);
    this.clearPage();

    if (this.getKeyword()) {
      const { gears, hasMore } = await this.searchDispatcher.searchList(
        this.getKeyword(),
        this.plusPage()
      );

      this.setResult(gears);
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

  public clearKeyword() {
    this.setKeyword('');
  }

  public getSelectedCount() {
    return this.selected.length;
  }

  public getSelected() {
    return this.selected;
  }

  public async register() {
    await this.searchDispatcher.register(this.selected);
    this.toastManager.show({ message: '내 장비 추가가 완료됐어요' });
    this.back();
  }

  public back() {
    const fromPath = this.location.state?.from;

    if (fromPath?.includes('/bag') || fromPath?.includes('/warehouse')) {
      this.navigate(-1);
    } else {
      this.navigate('/warehouse');
    }
  }
}

export default SearchWarehouse;

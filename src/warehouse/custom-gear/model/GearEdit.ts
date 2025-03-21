import CustomGearCategory from './CustomGearCategory';
import { action, makeObservable, observable } from 'mobx';
import WarehouseFilter from '../../model/WarehouseFilter.ts';
import FileUpload from '../../model/FileUpload';
import GearFilter from '../../model/GearFilter.ts';
import dayjs from 'dayjs';

abstract class GearEdit extends FileUpload {
  @observable private name = '';
  @observable private company = '';
  @observable private weight = '';
  @observable private loading = false;
  @observable private visible = false;
  @observable private errorMessage = '';

  protected constructor(
    private readonly category: CustomGearCategory,
    name: string,
    company: string,
    weight: string
  ) {
    super();
    this.name = name;
    this.company = company;
    this.weight = weight;
    makeObservable(this);
  }

  protected abstract _register(): Promise<void>;

  @action
  public setName(value: string) {
    this.name = value;
  }

  @action
  public setCompany(value: string) {
    this.company = value;
  }

  @action
  public setWeight(value: string) {
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
    try {
      this.validate();
      this.setLoading(true);
      await this._register();
      this.setLoading(false);
      this.hide();
    } catch (e) {
      console.log(e);
      this.setLoading(false);
    }
  }

  protected validate() {
    switch (true) {
      case !this.name: {
        this.setErrorMessage('이름을 입력해주세요');
        throw Error('Invalid name');
      }
      case !this.company: {
        this.setErrorMessage('브랜드를 입력해주세요');
        throw Error('Invalid company');
      }
      default: {
        break;
      }
    }
  }

  @action
  protected setLoading(value: boolean) {
    this.loading = value;
  }

  public isLoading() {
    return this.loading;
  }

  public show() {
    this.setVisible(true);
  }

  public hide() {
    this.setVisible(false);
    this.clear();
  }

  private clear() {
    this.setName('');
    this.setWeight('');
    this.clearFile();
    this.setErrorMessage('');
    this.setCompany('');
    this.category.clear();
  }

  @action
  private setVisible(value: boolean) {
    this.visible = value;
  }

  public isVisible() {
    return this.visible;
  }

  @action
  private setErrorMessage(value: string) {
    this.errorMessage = value;
  }

  public getErrorMessage() {
    return this.errorMessage;
  }

  public selectFilter(filter: WarehouseFilter) {
    this.category.selectFilter(filter);
  }

  public mapFilters<R>(callback: (filter: WarehouseFilter) => R) {
    return this.category.mapFilters(callback);
  }

  public getFileName(): string {
    return `${this.name}${this.company}${this.weight}-${dayjs().format('YYYY.MM.DD.HH.mm.ss')}`;
  }

  protected getSelectedFilter() {
    return this.category.getSelectedFilter();
  }

  protected getSelectedFirstCategory() {
    return this.category.getSelectedFirstCategory();
  }

  protected selectFilterWith(gearFilter: GearFilter) {
    this.category.selectFilterWith(gearFilter);
  }
}

export default GearEdit;

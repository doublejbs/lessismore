import CustomGearCategory from './CustomGearCategory';
import { action, makeObservable, observable } from 'mobx';
import WarehouseFilter from '../../warehouse/model/WarehouseFilter.ts';
import FileUpload from '../../warehouse/model/FileUpload';
import GearFilter from '../../warehouse/model/GearFilter.ts';
import dayjs from 'dayjs';
import Gear from '../../model/Gear.ts';

abstract class AbstractGearEdit extends FileUpload {
  @observable private name = '';
  @observable private company = '';
  @observable private weight = '';
  @observable private loading = false;
  @observable private errorMessage = '';
  @observable private color = '';

  protected constructor(
    private readonly category: CustomGearCategory,
    name: string,
    company: string,
    weight: string,
    color: string
  ) {
    super();
    this.name = name;
    this.company = company;
    this.weight = weight;
    this.color = color;
    makeObservable(this);
  }

  protected abstract _register(): Promise<Gear>;

  protected abstract hide(): void;

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

  @action
  public setColor(value: string) {
    this.color = value;
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

  public getColor() {
    return this.color;
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

  private clear() {
    this.setName('');
    this.setWeight('');
    this.clearFile();
    this.setErrorMessage('');
    this.setCompany('');
    this.setColor('');
    this.category.clear();
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

export default AbstractGearEdit;

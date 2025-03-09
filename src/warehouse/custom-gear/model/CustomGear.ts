import { makeAutoObservable } from 'mobx';
import app from '../../../App';
import FirebaseImageStorage from '../../../firebase/FirebaseImageStorage';
import GearStore from '../../../firebase/GearStore';
import Gear from '../../../search-warehouse/Gear';
import { uuidv4 } from '@firebase/util';
import WarehouseFilters from '../../WarehouseFilters';
import WarehouseFilter from '../../WarehouseFilter';
import GearFilter from '../../GearFilter';

class CustomGear {
  public static new() {
    return new CustomGear(app.getGearStore());
  }

  private readonly imageStorage = FirebaseImageStorage.new();
  private readonly filters = WarehouseFilters.new();
  private name = '';
  private company = '';
  private weight = '';
  private imageFile: File | null = null;
  private loading = false;
  private visible = false;
  private errorMessage = '';

  private constructor(private readonly gearStore: GearStore) {
    makeAutoObservable(this);
  }

  public setName(value: string) {
    this.name = value;
  }

  public setCompany(value: string) {
    this.company = value;
  }

  public setWeight(value: string) {
    this.weight = value;
  }

  public setFile(file: null | File) {
    this.imageFile = file;
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
      await this.gearStore.register([
        new Gear(
          uuidv4(),
          this.name,
          this.company,
          String(this.weight || 0),
          await this.getFileUrl(),
          true,
          true,
          this.filters.getSelectedFirstCategory(),
          this.filters.getSelectedFilter()
        ),
      ]);
      this.setLoading(false);
      this.hide();
    } catch (e) {
      this.setLoading(false);
    }
  }

  private async getFileUrl() {
    if (this.imageFile) {
      return await this.imageStorage.uploadFile(
        this.imageFile as File,
        `${this.name}${this.company}${this.weight}`
      );
    } else {
      return '';
    }
  }

  private validate() {
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

  private setLoading(value: boolean) {
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
    this.setFile(null);
    this.setErrorMessage('');
    this.setCompany('');
  }

  private setVisible(value: boolean) {
    this.visible = value;
  }

  public isVisible() {
    return this.visible;
  }

  private setErrorMessage(value: string) {
    this.errorMessage = value;
  }

  public getErrorMessage() {
    return this.errorMessage;
  }

  public getFilter() {
    return this.filters.getSelectedFilter();
  }

  public selectFilter(filter: GearFilter) {
    this.filters.selectFilterWith(filter);
  }

  public mapFilters<R>(callback: (filter: WarehouseFilter) => R) {
    return this.filters.mapFilters(callback);
  }
}

export default CustomGear;

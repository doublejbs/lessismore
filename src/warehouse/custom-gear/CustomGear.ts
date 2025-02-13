import { makeAutoObservable } from 'mobx';
import GearStore from '../../firebase/GearStore.ts';
import app from '../../App.ts';
import FirebaseImageStorage from '../../firebase/FirebaseImageStorage.ts';
import { v4 as uuidv4 } from 'uuid';
import Gear from '../../search-warehouse/Gear';

class CustomGear {
  public static new() {
    return new CustomGear(app.getGearStore());
  }

  private readonly imageStorage = FirebaseImageStorage.new();
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
          true
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
    this.setWeight(0);
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
}

export default CustomGear;

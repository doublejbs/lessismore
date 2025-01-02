import { makeAutoObservable } from 'mobx';
import GearStore from '../../firebase/GearStore.ts';
import app from '../../App.ts';
import Gear from '../search-warehouse/Gear.ts';
import FirebaseImageStorage from '../../firebase/FirebaseImageStorage.ts';
import { v4 as uuidv4 } from 'uuid';

class CustomGear {
  public static new() {
    return new CustomGear(app.getGearStore());
  }

  private readonly imageStorage = FirebaseImageStorage.new();
  private name = '';
  private company = '';
  private weight = 0;
  private imageFile: File | null = null;
  private loading = false;

  private constructor(private readonly gearStore: GearStore) {
    makeAutoObservable(this);
  }

  public setName(value: string) {
    this.name = value;
  }

  public setCompany(value: string) {
    this.company = value;
  }

  public setWeight(value: number) {
    this.weight = value;
  }

  public setFile(file: File) {
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
      if (this.validate()) {
        this.setLoading(true);
        const url = await this.imageStorage.uploadFile(
          this.imageFile as File,
          `${this.name}${this.company}${this.weight}`
        );

        await this.gearStore.register([
          new Gear(
            uuidv4(),
            this.name,
            this.company,
            String(this.weight),
            url,
            true
          ),
        ]);
        this.setLoading(false);
      }
    } catch (e) {
      this.setLoading(false);
    }
  }

  private validate() {
    return !!this.name && !!this.company && this.imageFile;
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  public isLoading() {
    return this.loading;
  }
}

export default CustomGear;

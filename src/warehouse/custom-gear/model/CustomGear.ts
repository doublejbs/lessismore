import { makeObservable } from 'mobx';
import app from '../../../App';
import GearStore from '../../../firebase/GearStore';
import Gear from '../../../model/Gear';
import { uuidv4 } from '@firebase/util';
import CustomGearCategory from './CustomGearCategory';
import GearEdit from './GearEdit';

class CustomGear extends GearEdit {
  public static new() {
    return new CustomGear(
      app.getGearStore(),
      CustomGearCategory.new().selectFirst(),
      '',
      '',
      ''
    );
  }

  private constructor(
    private readonly gearStore: GearStore,
    category: CustomGearCategory,
    name: string,
    company: string,
    weight: string
  ) {
    super(category, name, company, weight);
    makeObservable(this);
  }

  public async _register() {
    try {
      this.validate();
      this.setLoading(true);
      await this.gearStore.register([
        new Gear(
          uuidv4(),
          this.getName(),
          this.getCompany(),
          String(this.getWeight() || 0),
          await this.getFileUrl(),
          true,
          true,
          this.getSelectedFirstCategory(),
          this.getSelectedFilter(),
          []
        ),
      ]);
      this.setLoading(false);
      this.hide();
    } catch (e) {
      this.setLoading(false);
    }
  }

  public getFileName(): string {
    return `${this.getName()}${this.getCompany()}${this.getWeight()}`;
  }
}

export default CustomGear;

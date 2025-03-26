import { makeObservable } from 'mobx';
import app from '../../App';
import GearStore from '../../firebase/GearStore';
import Gear from '../../model/Gear';
import { uuidv4 } from '@firebase/util';
import CustomGearCategory from './CustomGearCategory';
import GearEdit from './GearEdit';
import { Location, NavigateFunction } from 'react-router-dom';

class CustomGear extends GearEdit {
  public static new(navigate: NavigateFunction, location: Location<any>) {
    return new CustomGear(
      navigate,
      location,
      app.getGearStore(),
      CustomGearCategory.new().selectFirst(),
      '',
      '',
      ''
    );
  }

  private constructor(
    private readonly navigate: NavigateFunction,
    private readonly location: Location<any>,
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
        [],
        []
      ),
    ]);
  }

  public getFileName(): string {
    return `${this.getName()}${this.getCompany()}${this.getWeight()}`;
  }

  public override hide() {
    this.navigate('/warehouse');
  }
}

export default CustomGear;

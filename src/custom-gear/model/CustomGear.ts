import { makeObservable } from 'mobx';
import app from '../../App';
import GearStore from '../../firebase/GearStore';
import Gear from '../../model/Gear';
import { uuidv4 } from '@firebase/util';
import CustomGearCategory from './CustomGearCategory';
import AbstractGearEdit from './AbstractGearEdit';
import Firebase from '../../firebase/Firebase';
import LogInAlertManager from '../../alert/login/LogInAlertManager';

class CustomGear extends AbstractGearEdit {
  public static new() {
    return new CustomGear(
      app.getGearStore(),
      app.getFirebase(),
      app.getLogInAlertManager(),
      CustomGearCategory.new().selectFirst(),
      '',
      '',
      '',
      ''
    );
  }

  protected constructor(
    private readonly gearStore: GearStore,
    private readonly firebase: Firebase,
    private readonly logInAlertManager: LogInAlertManager,
    category: CustomGearCategory,
    name: string,
    company: string,
    weight: string,
    color: string
  ) {
    super(category, name, company, weight, color);
    makeObservable(this);
  }

  public async initialize() {
    if (!this.isLoggedIn()) {
      this.logInAlertManager.show();
    }
  }

  public async _register() {
    const gear = new Gear(
      uuidv4(),
      this.getName(),
      this.getCompany(),
      this.getWeight(),
      await this.getFileUrl(),
      true,
      true,
      this.getSelectedFilter(),
      [],
      [],
      [],
      Date.now(),
      this.getColor(),
      this.getCompany()
    );

    await this.gearStore.register([gear]);

    return gear;
  }

  public getFileName(): string {
    return `${this.getName()}${this.getCompany()}${this.getWeight()}`;
  }

  public isLoggedIn() {
    return this.firebase.isLoggedIn();
  }
}

export default CustomGear;

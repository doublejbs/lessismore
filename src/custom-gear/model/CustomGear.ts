import { makeObservable } from 'mobx';
import app from '../../App';
import GearStore from '../../firebase/GearStore';
import Gear from '../../model/Gear';
import { uuidv4 } from '@firebase/util';
import CustomGearCategory from './CustomGearCategory';
import AbstractGearEdit from './AbstractGearEdit';
import { Location, NavigateFunction } from 'react-router-dom';
import Firebase from '../../firebase/Firebase';
import AlertManager from '../../alert/AlertManager';
import LogInAlertManager from '../../alert/login/LogInAlertManager';
class CustomGear extends AbstractGearEdit {
  public static new(navigate: NavigateFunction, location: Location) {
    return new CustomGear(
      navigate,
      location,
      app.getGearStore(),
      app.getFirebase(),
      app.getAlertManager(),
      app.getLogInAlertManager(),
      CustomGearCategory.new().selectFirst(),
      '',
      '',
      '',
      ''
    );
  }

  private constructor(
    private readonly navigate: NavigateFunction,
    private readonly location: Location,
    private readonly gearStore: GearStore,
    private readonly firebase: Firebase,
    private readonly alertManager: AlertManager,
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
    await this.gearStore.register([
      new Gear(
        uuidv4(),
        this.getName(),
        this.getCompany(),
        this.getWeight(),
        await this.getFileUrl(),
        true,
        true,
        this.getSelectedFirstCategory(),
        this.getSelectedFilter(),
        [],
        [],
        [],
        Date.now(),
        this.getColor(),
        this.getCompany()
      ),
    ]);
  }

  public getFileName(): string {
    return `${this.getName()}${this.getCompany()}${this.getWeight()}`;
  }

  public override hide() {
    const fromPath = this.location.state?.from;

    if (fromPath.includes('/bag') || fromPath.includes('/warehouse')) {
      this.navigate(-1);
    } else {
      this.navigate('/warehouse');
    }
  }

  public isLoggedIn() {
    return this.firebase.isLoggedIn();
  }
}

export default CustomGear;

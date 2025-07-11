import CustomGear from '../../custom-gear/model/CustomGear';
import { NavigateFunction } from 'react-router-dom';
import { Location } from 'react-router-dom';
import GearStore from '../../firebase/GearStore';
import CustomGearCategory from '../../custom-gear/model/CustomGearCategory';
import app from '../../App';
import LogInAlertManager from '../../alert/login/LogInAlertManager';
import Firebase from '../../firebase/Firebase';
import BagEdit from './BagEdit';

class BagEditCustomGear extends CustomGear {
  public static of(bagEdit: BagEdit, navigate: NavigateFunction, location: Location) {
    return new BagEditCustomGear(
      bagEdit,
      navigate,
      location,
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

  private constructor(
    private readonly bagEdit: BagEdit,
    navigate: NavigateFunction,
    location: Location,
    gearStore: GearStore,
    firebase: Firebase,
    logInAlertManager: LogInAlertManager,
    category: CustomGearCategory,
    name: string,
    company: string,
    weight: string,
    color: string
  ) {
    super(
      navigate,
      location,
      gearStore,
      firebase,
      logInAlertManager,
      category,
      name,
      company,
      weight,
      color
    );
  }

  public override async _register() {
    const gear = await super._register();

    this.bagEdit.prependGears([gear]);

    return gear;
  }

  public override hide() {
    this.bagEdit.hideAddMenu();
  }
}

export default BagEditCustomGear;

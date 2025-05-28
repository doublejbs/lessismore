import { NavigateFunction } from 'react-router-dom';
import SearchWarehouse from '../../search-warehouse/model/SearchWarehouse';
import app from '../../App';
import ToastManager from '../../toast/ToastManager';
import Firebase from '../../firebase/Firebase';
import LogInAlertManager from '../../alert/login/LogInAlertManager';
import SearchDispatcherType from '../../search-warehouse/model/SearchDispatcherType';
import SearchDispatcher from '../../search-warehouse/model/SearchDispatcher';
import { Location } from 'react-router-dom';
import { action, makeObservable, observable } from 'mobx';

class BagEditSearch extends SearchWarehouse {
  public static of(navigate: NavigateFunction, location: Location) {
    return new BagEditSearch(
      SearchDispatcher.new(),
      app.getToastManager(),
      navigate,
      location,
      app.getFirebase(),
      app.getLogInAlertManager()
    );
  }

  @observable private visible = false;

  private constructor(
    dispatcher: SearchDispatcherType,
    toastManager: ToastManager,
    navigate: NavigateFunction,
    location: Location,
    firebase: Firebase,
    logInAlertManager: LogInAlertManager
  ) {
    super(dispatcher, toastManager, navigate, location, firebase, logInAlertManager);
    makeObservable(this);
  }

  public override back() {
    this.hide();
  }

  public show() {
    this.setVisible(true);
  }

  public hide() {
    this.setVisible(false);
  }

  @action
  private setVisible(value: boolean) {
    this.visible = value;
  }

  public isVisible() {
    return this.visible;
  }
}

export default BagEditSearch;

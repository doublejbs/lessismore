import { makeAutoObservable } from 'mobx';
import Firebase from './firebase/Firebase.ts';
import GearStore from './firebase/GearStore.ts';
import BagStore from './firebase/BagStore.ts';
import SearchStore from './firebase/SearchStore.ts';
import AlertManager from './alert/AlertManager';
import ToastManager from './toast/ToastManager';
import LogInAlertManager from './alert/login/LogInAlertManager';

class App {
  private readonly firebase = new Firebase();
  private gearStore!: GearStore;
  private bagStore!: BagStore;
  private searchStore!: SearchStore;
  private alertManager!: AlertManager;
  private logInAlertManager!: LogInAlertManager;
  private toastManager!: ToastManager;
  private initialized = false;

  public constructor() {
    makeAutoObservable(this);
  }

  public async initialize() {
    await this.firebase.initialize();
    this.gearStore = new GearStore(this.firebase);
    this.setBagStore(new BagStore(this.firebase, this.gearStore));
    this.searchStore = new SearchStore(this.firebase);
    this.alertManager = AlertManager.new();
    this.toastManager = ToastManager.new();
    this.logInAlertManager = LogInAlertManager.new();
    this.setInitialized(true);
  }

  public getFirebase() {
    return this.firebase;
  }

  public getBagStore() {
    return this.bagStore;
  }

  public getStore() {
    return this.firebase.getStore();
  }

  public getStorage() {
    return this.firebase.getStorage();
  }

  private setBagStore(value: BagStore) {
    this.bagStore = value;
  }

  public getGearStore() {
    return this.gearStore;
  }

  public getSearchStore() {
    return this.searchStore;
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  public isInitialized() {
    return this.initialized;
  }

  public getAlertManager() {
    return this.alertManager;
  }

  public getToastManager() {
    return this.toastManager;
  }

  public getLogInAlertManager() {
    return this.logInAlertManager;
  }
}

const app = new App();

export default app;

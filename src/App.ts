import { makeAutoObservable } from 'mobx';
import Firebase from './firebase/Firebase.ts';
import GearStore from './firebase/GearStore.ts';
import BagStore from './firebase/BagStore.ts';
import SearchStore from './firebase/SearchStore.ts';
import WarehouseEdit from './warehouse/edit/model/WarehouseEdit';
import WarehouseDetail from './warehouse/detail/model/WarehouseDetail';
import CustomGearCategory from './warehouse/custom-gear/model/CustomGearCategory.ts';
import WarehouseEditDispatcher from './warehouse/edit/model/WarehouseEditDispatcher.ts';
import AlertManager from './alert/AlertManager';
import ToastManager from './toast/ToastManager';

class App {
  private readonly firebase = new Firebase();
  private gearStore!: GearStore;
  private bagStore!: BagStore;
  private searchStore!: SearchStore;
  private warehouseEdit!: WarehouseEdit;
  private warehouseDetail!: WarehouseDetail;
  private alertManager!: AlertManager;
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
    this.warehouseEdit = WarehouseEdit.from(
      WarehouseEditDispatcher.from(this.gearStore),
      CustomGearCategory.new()
    );
    this.warehouseDetail = WarehouseDetail.new();
    this.alertManager = AlertManager.new();
    this.toastManager = ToastManager.new();
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

  public getWarehouseEdit() {
    return this.warehouseEdit;
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  public isInitialized() {
    return this.initialized;
  }

  public getWarehouseDetail() {
    return this.warehouseDetail;
  }

  public getAlertManager() {
    return this.alertManager;
  }

  public getToastManager() {
    return this.toastManager;
  }
}

const app = new App();

export default app;

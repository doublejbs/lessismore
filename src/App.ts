import { makeAutoObservable } from 'mobx';
import Firebase from './firebase/Firebase.ts';
import GearStore from './firebase/GearStore.ts';
import BagStore from './firebase/BagStore.ts';
import SearchStore from './firebase/SearchStore.ts';
import WarehouseEdit from './warehouse/edit/model/WarehouseEdit';

class App {
  private readonly firebase = new Firebase();
  private gearStore!: GearStore;
  private bagStore!: BagStore;
  private searchStore!: SearchStore;
  private warehouseEdit!: WarehouseEdit;
  private initialized = false;

  public constructor() {
    makeAutoObservable(this);
  }

  public async initialize() {
    await this.firebase.initialize();
    this.gearStore = new GearStore(this.firebase);
    this.bagStore = new BagStore(this.firebase, this.gearStore);
    this.searchStore = new SearchStore(this.firebase);
    this.warehouseEdit = WarehouseEdit.new(this.gearStore);
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
}

const app = new App();

export default app;

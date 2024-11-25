import { makeAutoObservable } from 'mobx';
import Firebase from './firebase/Firebase.ts';
import GearStore from './firebase/GearStore.ts';
import BagStore from './firebase/BagStore.ts';

class App {
  private readonly firebase = new Firebase();
  private gearStore!: GearStore;
  private bagStore!: BagStore;
  private initialized = false;

  public constructor() {
    makeAutoObservable(this);
  }

  public async initialize() {
    await this.firebase.initialize();
    this.gearStore = new GearStore(this.firebase);
    this.bagStore = new BagStore(this.firebase);
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

  public getGearStore() {
    return this.gearStore;
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

import Firebase from "@/firebase/Firebase.ts";
import GearStore from "@/firebase/GearStore.ts";

class App {
  private readonly firebase = new Firebase();
  private gearStore: GearStore;
  public constructor() {}

  public async initialize() {
    await this.firebase.initialize();
    this.gearStore = new GearStore(this.firebase.getStore());
  }

  public getFirebase() {
    return this.firebase;
  }

  public getStore() {
    return this.firebase.getStore();
  }
}

const app = new App();

export default app;

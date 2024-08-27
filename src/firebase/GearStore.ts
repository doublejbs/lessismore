import {
  collection,
  Firestore,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

class GearStore {
  public constructor(private readonly store: Firestore) {}

  public async getList() {
    return (
      await getDocs(
        query(collection(this.store, "gear"), orderBy("name", "asc")),
      )
    ).docs;
  }
}

export default GearStore;

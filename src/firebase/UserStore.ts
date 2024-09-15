import {
  collection,
  Firestore,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';

class UserStore {
  public static from(userId: string, store: Firestore) {
    return new UserStore(userId, store);
  }

  private constructor(
    private readonly userId: string,
    private readonly store: Firestore
  ) {}

  public async getGears() {
    console.log(await getDocs(query(collection(this.store, 'users'))));
  }
}

export default UserStore;

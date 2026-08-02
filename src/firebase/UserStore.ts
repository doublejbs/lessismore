import { collection, Firestore, getDocs, query, getCountFromServer } from 'firebase/firestore';

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

  public async getUserCount(): Promise<number> {
    try {
      const usersCollection = collection(this.store, 'users');
      const snapshot = await getCountFromServer(usersCollection);
      return snapshot.data().count;
    } catch (error) {
      console.error('사용자 수를 가져오는 중 오류 발생:', error);
      throw error;
    }
  }
}

export default UserStore;

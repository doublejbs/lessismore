import { makeObservable, observable, action } from 'mobx';
import UserStore from '../../firebase/UserStore';
import Firebase from '../../firebase/Firebase';

class Celebrate {
  private readonly firebase: Firebase;
  private readonly userStore: UserStore;
  public userCount: number = 0;
  public isLoading: boolean = true;

  constructor(firebase: Firebase) {
    this.firebase = firebase;
    this.userStore = UserStore.from('', firebase.getStore());

    makeObservable(this, {
      userCount: observable,
      isLoading: observable,
      setUserCount: action,
      setIsLoading: action,
      fetchUserCount: action,
    });
  }

  public get getUserCount(): number {
    return this.userCount;
  }

  public get getIsLoading(): boolean {
    return this.isLoading;
  }

  public setUserCount(count: number): void {
    this.userCount = count;
  }

  public setIsLoading(loading: boolean): void {
    this.isLoading = loading;
  }

  public async fetchUserCount(): Promise<void> {
    if (this.userCount > 0) return;

    try {
      this.setIsLoading(true);
      const count = await this.getUserCountFromFirebase();
      this.setUserCount(count);
    } catch (error) {
      console.error('사용자 수를 가져오는 중 오류 발생:', error);
      this.setUserCount(0);
    } finally {
      this.setIsLoading(false);
    }
  }

  private async getUserCountFromFirebase(): Promise<number> {
    try {
      return await this.userStore.getUserCount();
    } catch (error) {
      console.error('Firebase에서 사용자 수를 가져오는 중 오류 발생:', error);
      // 오류 발생 시 테스트 데이터 반환
      return Math.floor(Math.random() * 5000) + 1500;
    }
  }
}

export default Celebrate;

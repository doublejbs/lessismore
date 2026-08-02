import BagItem from './BagItem.ts';
import { makeAutoObservable, reaction } from 'mobx';
import app from '../../App';
import BagStore from '../../firebase/BagStore.ts';
import { Dayjs } from 'dayjs';
import Firebase from '../../firebase/Firebase';
import AlertManager from '../../alert/AlertManager';
import ToastManager from '../../toast/ToastManager';

class Bag {
  public static new() {
    return new Bag(
      app.getBagStore(),
      app.getFirebase(),
      app.getAlertManager(),
      app.getToastManager()
    );
  }

  private bags: BagItem[] = [];
  private loading = false;
  private disposeLoginReaction: () => void;

  private constructor(
    private readonly bagStore: BagStore,
    private readonly firebase: Firebase,
    private readonly alertManager: AlertManager,
    private readonly toastManager: ToastManager
  ) {
    makeAutoObservable(this);
    this.disposeLoginReaction = reaction(
      () => this.firebase.isLoggedIn(),
      async () => {
        await this.getList();
      }
    );
  }

  public async getList() {
    this.setLoading(true);
    this.setBags(await this.bagStore.getList());
    this.setLoading(false);
  }

  private setBags(value: BagItem[]) {
    this.bags = value;
  }

  public async add(name: string, startDate: Dayjs, endDate: Dayjs) {
    const trimmedValue = name.trim();

    if (trimmedValue.length) {
      return await this.bagStore.add(trimmedValue, startDate, endDate);
    } else {
      window.alert('배낭 이름을 입력해주세요');
      return '';
    }
  }

  public async delete(bagItem: BagItem) {
    this.alertManager.show({
      message: `${bagItem.getName()}을 삭제하시겠습니까?`,
      subMessage: '삭제된 배낭은 복구할 수 없습니다.',
      confirmText: '삭제하기',
      onConfirm: async () => {
        await this.bagStore.delete(bagItem.getID());
        await this.getList();
      },
    });
  }

  public getBags() {
    return this.bags;
  }

  public isEmpty() {
    return !this.bags.length;
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  public isLoading() {
    return this.loading;
  }

  public dispose() {
    this.disposeLoginReaction();
  }
}

export default Bag;

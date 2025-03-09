import BagItem from './BagItem.ts';
import { makeAutoObservable } from 'mobx';
import app from '../../App';
import BagStore from '../../firebase/BagStore.ts';

class Bag {
  public static new() {
    return new Bag(app.getBagStore());
  }

  private bags: BagItem[] = [];
  private loading = false;

  private constructor(private readonly bagStore: BagStore) {
    makeAutoObservable(this);
  }

  public async getList() {
    this.setLoading(true);
    this.setBags(await this.bagStore.getList());
    this.setLoading(false);
  }

  private setBags(value: BagItem[]) {
    this.bags = value;
  }

  public async add(value: string) {
    await this.bagStore.add(value);
    await this.getList();
  }

  public async delete(bagItem: BagItem) {
    await this.bagStore.delete(bagItem.getID());
    await this.getList();
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
}

export default Bag;

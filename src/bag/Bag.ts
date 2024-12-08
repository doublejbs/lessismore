import BagItem from './BagItem.ts';
import BagStore from '../firebase/BagStore.ts';
import app from '../App.ts';
import { makeAutoObservable } from 'mobx';

class Bag {
  public static new() {
    return new Bag(app.getBagStore());
  }

  private bags: BagItem[] = [];

  private constructor(private readonly bagStore: BagStore) {
    makeAutoObservable(this);
  }

  public async getList() {
    this.setBags(await this.bagStore.getList());
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
}

export default Bag;

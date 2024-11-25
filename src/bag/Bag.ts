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
    this.bags = await this.bagStore.getList();
  }

  public async add(value: string) {
    await this.bagStore.add(value);
  }

  public getBags() {
    return this.bags;
  }

  public isEmpty() {
    return !this.bags.length;
  }
}

export default Bag;

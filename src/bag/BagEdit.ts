import BagStore from '../firebase/BagStore.ts';
import app from '../App.ts';
import { makeAutoObservable } from 'mobx';

class BagEdit {
  public static from(id: string) {
    return new BagEdit(id, app.getBagStore());
  }

  private name: string = '';

  private constructor(
    private readonly id: string,
    private readonly bagStore: BagStore
  ) {
    makeAutoObservable(this);
  }

  public async initialize() {
    const { name } = await this.bagStore.getBag(this.id);
    this.setName(name);
  }
  private setName(value: string) {
    this.name = value;
  }

  public getName() {
    return this.name;
  }
}

export default BagEdit;

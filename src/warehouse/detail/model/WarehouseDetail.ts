import { makeAutoObservable } from 'mobx';
import Gear from '../../../model/Gear';
import BagStore from '../../../firebase/BagStore';
import app from '../../../App';
import BagItem from '../../../bag/model/BagItem';
import WarehouseEdit from '../../edit/model/WarehouseEdit';

class WarehouseDetail {
  public static new() {
    return new WarehouseDetail(app.getBagStore(), app.getWarehouseEdit());
  }

  private visible = false;
  private gear: Gear | null = null;
  private bags: BagItem[] = [];
  private onRegister: (gear: Gear) => Promise<void> = async () => {};

  private constructor(
    private readonly bagStore: BagStore,
    private readonly warehouseEdit: WarehouseEdit
  ) {
    makeAutoObservable(this);
  }

  public async open(gear: Gear, onRegister: (gear: Gear) => Promise<void>) {
    this.setGear(gear);
    this.setOnRegister(onRegister);
    this.setBags(await this.bagStore.getBags(gear.getBags()));
    this.setVisible(true);
  }

  public editWith(gear: Gear, onRegister: (gear: Gear) => Promise<void>) {
    this.setGear(gear);
    this.setOnRegister(onRegister);
    this.edit();
  }

  public edit() {
    if (this.gear) {
      this.warehouseEdit.open(this.gear, async (gear: Gear) => {
        this.setGear(gear);
        await this.onRegister(gear);
      });
    }
  }

  public hide() {
    this.setGear(null);
    this.setBags([]);
    this.setVisible(false);
  }

  private setVisible(value: boolean) {
    this.visible = value;
  }

  private setGear(gear: Gear | null) {
    this.gear = gear;
  }

  public getGear() {
    return this.gear;
  }

  public isVisible() {
    return this.visible && this.gear;
  }

  private setBags(value: BagItem[]) {
    this.bags = value;
  }

  public mapBags<R>(callback: (bag: BagItem) => R): R[] {
    return this.bags.map(callback);
  }

  private setOnRegister(value: (gear: Gear) => Promise<void>) {
    this.onRegister = value;
  }
}

export default WarehouseDetail;

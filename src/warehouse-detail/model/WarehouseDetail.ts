import { makeAutoObservable } from 'mobx';
import Gear from '../../model/Gear';
import BagStore from '../../firebase/BagStore';
import app from '../../App';
import BagItem from '../../bag/model/BagItem';
import GearStore from '../../firebase/GearStore';
import { NavigateFunction, Location } from 'react-router-dom';
import WarehouseDispatcherType from '../../warehouse/model/WarehouseDispatcherType';
import AlertManager from '../../alert/AlertManager';
import ToastManager from '../../toast/ToastManager';

class WarehouseDetail {
  public static new(
    navigate: NavigateFunction,
    dispatcher: WarehouseDispatcherType,
    location: Location
  ) {
    return new WarehouseDetail(
      app.getBagStore(),
      app.getGearStore(),
      navigate,
      dispatcher,
      app.getAlertManager(),
      app.getToastManager(),
      location
    );
  }

  private gear: Gear | null = null;
  private bags: BagItem[] = [];
  private initialized = false;

  private constructor(
    private readonly bagStore: BagStore,
    private readonly gearStore: GearStore,
    private readonly navigate: NavigateFunction,
    private readonly dispatcher: WarehouseDispatcherType,
    private readonly alertManager: AlertManager,
    private readonly toastManager: ToastManager,
    private readonly location: Location
  ) {
    makeAutoObservable(this);
  }

  public async initialize(id: string) {
    try {
      this.setInitialized(false);
      const gear = await this.gearStore.getGear(id);

      this.setGear(gear);
      this.setBags(await this.bagStore.getBags(this.getGear()?.getBags() ?? []));
      this.setInitialized(true);
    } catch (e) {
      window.alert('잘못된 접근입니다');
    }
  }

  public edit() {
    if (this.getGear()) {
      this.navigate(`/gear/edit/${this.getGear()?.getId()}`);
    }
  }

  public async delete(gear: Gear) {
    this.alertManager.show({
      message: `${gear.getName()}을 삭제하시겠습니까?`,
      confirmText: '삭제하기',
      onConfirm: async () => {
        await this.deleteGear(gear);
      },
    });
  }

  private async deleteGear(gear: Gear) {
    await this.dispatcher.remove(gear);
    this.toastManager.show({ message: '삭제 되었습니다.' });
    this.close();
  }

  private setGear(gear: Gear | null) {
    this.gear = gear;
  }

  public getGear() {
    return this.gear;
  }

  private setBags(value: BagItem[]) {
    this.bags = value;
  }

  public mapBags<R>(callback: (bag: BagItem) => R): R[] {
    return this.bags.map(callback);
  }

  private setInitialized(initialized: boolean) {
    this.initialized = initialized;
  }

  public isInitialized() {
    return this.initialized;
  }

  public close() {
    const fromPath = this.location.state?.from;

    if (fromPath.includes('/warehouse')) {
      this.navigate(-1);
    } else {
      this.navigate('/warehouse');
    }
  }
}

export default WarehouseDetail;

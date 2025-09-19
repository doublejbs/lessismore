import { makeAutoObservable } from 'mobx';
import Gear from '../../model/Gear';
import BagStore from '../../firebase/BagStore';
import app from '../../App';
import BagItem from '../../bag/model/BagItem';
import GearStore from '../../firebase/GearStore';
import { Location } from 'react-router-dom';
import WarehouseDispatcherType from '../../warehouse/model/WarehouseDispatcherType';
import AlertManager from '../../alert/AlertManager';
import ToastManager from '../../toast/ToastManager';
import WebViewManager from '../../webview/WebViewManager';

class WarehouseDetail {
  public static new(
    dispatcher: WarehouseDispatcherType,
    location: Location,
    webViewManager: WebViewManager
  ) {
    return new WarehouseDetail(
      app.getBagStore(),
      app.getGearStore(),
      dispatcher,
      app.getAlertManager(),
      app.getToastManager(),
      location,
      webViewManager
    );
  }

  private gear: Gear | null = null;
  private bags: BagItem[] = [];
  private initialized = false;
  private id: string = '';

  private constructor(
    private readonly bagStore: BagStore,
    private readonly gearStore: GearStore,
    private readonly dispatcher: WarehouseDispatcherType,
    private readonly alertManager: AlertManager,
    private readonly toastManager: ToastManager,
    private readonly location: Location,
    private readonly webViewManager: WebViewManager
  ) {
    makeAutoObservable(this);
  }

  public async initialize(id: string) {
    try {
      this.setInitialized(false);
      this.webViewManager.setRefreshCallback(this.getGearData.bind(this));
      this.setId(id);
      await this.getGearData();
      this.setInitialized(true);
    } catch (e) {
      window.alert(`잘못된 접근입니다. ${id} ${e}`);
    }
  }

  private async getGearData() {
    const gear = await this.gearStore.getGear(this.id);
    this.setGear(gear);
    this.setBags(await this.bagStore.getBags(this.getGear()?.getBags() ?? []));
  }

  public edit(push: any) {
    push('GearEditWrapperView', { id: this.getGear()?.getId() });
  }

  public async delete(gear: Gear, pop: any) {
    this.alertManager.show({
      message: `${gear.getName()}을 삭제하시겠습니까?`,
      confirmText: '삭제하기',
      onConfirm: async () => {
        await this.deleteGear(gear, pop);
      },
    });
  }

  private async deleteGear(gear: Gear, pop: any) {
    await this.dispatcher.remove(gear);
    this.toastManager.show({ message: '삭제 되었습니다.' });
    this.close(pop);
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

  public close(pop: any) {
    pop();
  }

  public isWebView() {
    return this.webViewManager.isWebView();
  }

  private setId(id: string) {
    this.id = id;
  }

  public goToBag(bag: BagItem, push: any) {
    push('BagDetailWrapper', { id: bag.getID() });
  }

  public back(pop: any) {
    if (this.isWebView()) {
      this.webViewManager.closeWebView();
    } else {
      pop();
    }
  }
}

export default WarehouseDetail;

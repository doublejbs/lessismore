import { makeAutoObservable } from 'mobx';
import Gear from '../../model/Gear.ts';
import GearFilter from './GearFilter.ts';
import WarehouseFilter from './WarehouseFilter.ts';
import WarehouseDispatcherType from './WarehouseDispatcherType.ts';
import WarehouseDispatcher from './WarehouseDispatcher.ts';
import ToastManager from '../../toast/ToastManager';
import FilterManager from './FilterManager';

class Warehouse {
  public static from(dispatcher: WarehouseDispatcher, toastManager: ToastManager) {
    return new Warehouse(dispatcher, toastManager, FilterManager.from());
  }

  private gears: Gear[] = [];

  private loading = false;

  private constructor(
    private readonly dispatcher: WarehouseDispatcherType,
    private readonly toastManager: ToastManager,
    private readonly filterManager: FilterManager,
  ) {
    makeAutoObservable(this);
  }

  public async getList() {
    this.setGears(await this.dispatcher.getList(this.filterManager.getSelectedFilters()));
  }

  public async remove(value: Gear) {
    await this.dispatcher.remove(value);
    await this.getList();
    this.toastManager.show({ message: '삭제 되었습니다.' });
  }

  private setGears(value: Gear[]) {
    this.gears = value;
  }

  public getGears() {
    return this.gears;
  }

  public mapFilters<R>(callback: (filter: WarehouseFilter) => R) {
    return this.filterManager.mapFilters(callback);
  }

  public toggleFilter(filter: WarehouseFilter) {
    if (filter.isSelected()) {
      this.deselectFilter(filter);
    } else {
      this.selectFilter(filter);
    }
  }

  public async deselectFilter(filter: WarehouseFilter) {
    if (this.filterManager.isAllFilterSelected()) {
      return;
    } else {
      this.setLoading(true);
      this.filterManager.deselectFilter(filter);
      await this.getList();
      this.setLoading(false);
    }
  }

  public async selectFilter(filter: WarehouseFilter) {
    this.setLoading(true);
    this.filterManager.selectFilter(filter);
    await this.getList();
    this.setLoading(false);
  }

  public async updateGear(gear: Gear) {
    this.setGears(
      this.gears.map((currentGear) => {
        if (currentGear.isSame(gear)) {
          return gear;
        } else {
          return currentGear;
        }
      }),
    );
  }

  public isEmpty() {
    return this.gears.length === 0 && this.filterManager.isAllFilterSelected() && !this.isLoading();
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  private isLoading() {
    return this.loading;
  }
}

export default Warehouse;

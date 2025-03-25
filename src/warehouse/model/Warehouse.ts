import { makeAutoObservable } from 'mobx';
import app from '../../App.ts';
import Gear from '../../model/Gear.ts';
import GearFilter from './GearFilter.ts';
import WarehouseFilter from './WarehouseFilter.ts';
import WarehouseDispatcherType from './WarehouseDispatcherType.ts';
import WarehouseDispatcher from './WarehouseDispatcher.ts';
import ToastManager from '../../toast/ToastManager';

class Warehouse {
  public static from(
    dispatcher: WarehouseDispatcher,
    toastManager: ToastManager
  ) {
    return new Warehouse(dispatcher, toastManager);
  }

  private readonly filters: WarehouseFilter[] = [
    {
      filter: GearFilter.All,
      name: '전체',
    },
    {
      filter: GearFilter.Tent,
      name: '텐트',
    },
    {
      filter: GearFilter.SleepingBag,
      name: '침낭',
    },
    {
      filter: GearFilter.Backpack,
      name: '배낭',
    },
    {
      filter: GearFilter.Clothing,
      name: '의류',
    },
    {
      filter: GearFilter.Mat,
      name: '매트',
    },
    {
      filter: GearFilter.Furniture,
      name: '가구',
    },
    {
      filter: GearFilter.Lantern,
      name: '랜턴',
    },
    {
      filter: GearFilter.Cooking,
      name: '조리',
    },
    {
      filter: GearFilter.Etc,
      name: '기타',
    },
  ].map(({ filter, name }) => WarehouseFilter.from(filter, name));
  private gears: Gear[] = [];

  private loading = false;

  private constructor(
    private readonly dispatcher: WarehouseDispatcherType,
    private readonly toastManager: ToastManager
  ) {
    makeAutoObservable(this);
    this.filters[0].select();
  }

  public async getList() {
    this.setGears(await this.dispatcher.getList(this.getSelectedFilter()));
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
    return this.filters.map(callback);
  }

  public async selectFilter(filter: WarehouseFilter) {
    this.setLoading(true);
    this.filters.forEach((currentFilter) => {
      if (currentFilter === filter) {
        currentFilter.select();
      } else {
        currentFilter.deselect();
      }
    });
    await this.getList();
    this.setLoading(false);
  }

  private getSelectedFilter() {
    return (
      this.filters.find((filter) => filter.isSelected())?.getFilter() ??
      GearFilter.All
    );
  }

  public async updateGear(gear: Gear) {
    this.setGears(
      this.gears.map((currentGear) => {
        if (currentGear.isSame(gear)) {
          return gear;
        } else {
          return currentGear;
        }
      })
    );
  }

  public isEmpty() {
    return (
      this.gears.length === 0 && this.isAllFilterSelected() && !this.isLoading()
    );
  }

  private isAllFilterSelected() {
    return this.filters[0].isSelected();
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  private isLoading() {
    return this.loading;
  }
}

export default Warehouse;

import { makeAutoObservable } from 'mobx';
import GearFilter from '../../warehouse/model/GearFilter';
import WarehouseFilter from '../../warehouse/model/WarehouseFilter';
import BagStore from '../../firebase/BagStore';
import GearStore from '../../firebase/GearStore';
import FilterManager from '../../warehouse/model/FilterManager';
import Order from '../../order/Order';
import OrderType from '../../order/OrderType';
import app from '../../App';
import Gear from '../../model/Gear';
import dayjs from 'dayjs';

class BagShare {
  private static readonly ORDER_KEY = 'bag-share';

  public static from(id: string) {
    return new BagShare(
      id,
      app.getBagStore(),
      app.getGearStore(),
      FilterManager.from(),
      Order.new(BagShare.ORDER_KEY)
    );
  }

  private name: string = '';
  private weight: string = '';
  private gears: Gear[] = [];
  private initialized = false;
  private editDate = dayjs();
  private startDate = dayjs();
  private endDate = dayjs();

  private constructor(
    private readonly id: string,
    private readonly bagStore: BagStore,
    private readonly gearStore: GearStore,
    private readonly filterManager: FilterManager,
    private readonly order: Order
  ) {
    makeAutoObservable(this);
  }

  public async initialize() {
    try {
      const bag = await this.bagStore.getSharedBag(
        this.id,
        [GearFilter.All],
        this.order.getSelectedOrderType() ?? OrderType.NameAsc
      );

      if (bag) {
        this.name = bag.name || '';
        this.weight = bag.weight || '';
        this.gears = bag.gears || [];
        this.editDate = dayjs(bag.editDate);
        this.startDate = dayjs(bag.startDate);
        this.endDate = dayjs(bag.endDate);
        this.initialized = true;
      }
    } catch (error) {
      console.error('공유된 배낭을 불러오는 중 오류가 발생했습니다:', error);
    }
  }

  public isInitialized() {
    return this.initialized;
  }

  public getName() {
    return this.name;
  }

  public getWeight() {
    return Number(this.weight) / 1000;
  }

  public getGears() {
    return this.gears;
  }

  public getStartDate() {
    return this.startDate.format('YYYY.MM.DD');
  }

  public getEndDate() {
    return this.endDate.format('YYYY.MM.DD');
  }

  public getDateRange() {
    const start = this.startDate.format('YYYY.MM.DD');
    const end = this.endDate.format('YYYY.MM.DD');
    return start === end ? start : `${start} - ${end}`;
  }

  public mapGears<R>(callback: (gear: Gear) => R) {
    return this.gears
      .filter((gear) => this.filterManager.hasFilter(gear.getCategory() as GearFilter))
      .map(callback);
  }

  public getId() {
    return this.id;
  }

  public getOrder() {
    return this.order;
  }

  public async selectFilter(filter: WarehouseFilter) {
    this.filterManager.selectFilter(filter);
  }

  public async deselectFilter(filter: WarehouseFilter) {
    this.filterManager.deselectFilter(filter);
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
}

export default BagShare;

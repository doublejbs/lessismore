import { NavigateFunction, Location } from 'react-router-dom';
import FilterManager from '../../warehouse/model/FilterManager';
import BagStore from '../../firebase/BagStore';
import app from '../../App';
import Gear from '../../model/Gear';
import WarehouseDispatcherType from '../../warehouse/model/WarehouseDispatcherType';
import WarehouseDispatcher from '../../warehouse/model/WarehouseDispatcher';
import { makeAutoObservable, reaction } from 'mobx';
import WarehouseFilter from '../../warehouse/model/WarehouseFilter';
import GearFilter from '../../warehouse/model/GearFilter';
import Order from '../../order/Order';
import OrderType from '../../order/OrderType';

class BagEdit {
  public static from(navigate: NavigateFunction, location: Location, id: string) {
    return new BagEdit(
      navigate,
      location,
      id,
      app.getBagStore(),
      WarehouseDispatcher.new(),
      FilterManager.from(),
      Order.new()
    );
  }

  private selectedGears: Gear[] = [];
  private weight: number = 0;
  private toRemoveGears: Gear[] = [];
  private toAddGears: Gear[] = [];
  private warehouseGears: Gear[] = [];
  private loading = false;
  private initialized = false;
  private disposeReaction: () => void;

  private constructor(
    private readonly navigate: NavigateFunction,
    private readonly location: Location,
    private readonly id: string,
    private readonly bagStore: BagStore,
    private readonly dispatcher: WarehouseDispatcherType,
    private readonly filterManager: FilterManager,
    private readonly order: Order
  ) {
    makeAutoObservable(this);
    this.disposeReaction = reaction(
      () => this.order.getSelectedOrderType(),
      async () => {
        await this.initialize();
      }
    );
  }

  public dispose() {
    this.disposeReaction();
  }

  public async initialize() {
    if (this.isLoading()) {
      return;
    } else {
      this.setLoading(true);

      const { weight, gears } = await this.bagStore.getBag(
        this.id,
        this.filterManager.getSelectedFilters(),
        this.order.getSelectedOrderType() ?? OrderType.NameAsc
      );

      this.setSelectedGears(gears);
      this.setWeight(+weight);

      await this.getList();
      this.filterManager.initializeWithSelectedGears(this.selectedGears);
      this.setLoading(false);
      this.setInitialized(true);
    }
  }

  private async getList() {
    this.setWarehouseGears(
      await this.dispatcher.getList(
        this.filterManager.getSelectedFilters(),
        this.order.getSelectedOrderType() ?? OrderType.NameAsc
      )
    );
  }

  private setSelectedGears(gears: Gear[]) {
    this.selectedGears = gears;
  }

  private setWeight(weight: number) {
    this.weight = weight;
  }

  public getWeight() {
    return Number(this.weight) / 1000;
  }

  public getCount() {
    return this.selectedGears.length;
  }

  public async save() {
    await this.bagStore.save(this.id, this.toAddGears, this.toRemoveGears, this.selectedGears);
    this.back();
  }

  public back() {
    const fromPath = this.location.state?.from;

    if (fromPath?.includes(`/bag/${this.id}`)) {
      this.navigate(-1);
    } else {
      this.navigate(`/bag/${this.id}`);
    }
  }

  public addGear(gear: Gear) {
    if (this.hasGear(gear)) {
      return;
    }

    this.selectedGears.push(gear);
    this.toAddGears.push(gear);
    this.toRemoveGears = this.toRemoveGears.filter((g) => !g.isSame(gear));
    this.filterManager.addFilterCount(gear.getSubCategory() as GearFilter);
    this.updateWeight();
  }

  public removeGear(gear: Gear) {
    this.selectedGears = this.selectedGears.filter((g) => !g.isSame(gear));
    this.toAddGears = this.toAddGears.filter((g) => !g.isSame(gear));
    this.toRemoveGears.push(gear);
    this.filterManager.minusFilterCount(gear.getSubCategory() as GearFilter);
    this.updateWeight();
  }

  private updateWeight() {
    const totalWeight = this.selectedGears.reduce(
      (acc: number, gear) => acc + Number(gear.getWeight()),
      0
    );
    this.setWeight(totalWeight);
  }

  public hasGear(gear: Gear) {
    return this.selectedGears.some((g) => g.isSame(gear));
  }

  public showSearch() {
    this.navigate(`/bag/${this.id}/edit/search`, { state: { from: `/bag/${this.id}/edit` } });
  }

  public showWrite() {
    this.navigate(`/warehouse/custom`, { state: { from: `/bag/${this.id}/edit` } });
  }

  private setWarehouseGears(gears: Gear[]) {
    this.warehouseGears = gears;
  }

  public mapWarehouseGears<R>(callback: (gear: Gear) => R) {
    return this.warehouseGears.map(callback);
  }

  public toggleFilter(filter: WarehouseFilter) {
    if (filter.isSelected()) {
      this.deselectFilter(filter);
    } else {
      this.selectFilter(filter);
    }
  }

  public async deselectFilter(filter: WarehouseFilter) {
    this.setLoading(true);
    this.filterManager.deselectFilter(filter);
    await this.getList();
    this.setLoading(false);
  }

  public async selectFilter(filter: WarehouseFilter) {
    this.setLoading(true);
    this.filterManager.selectFilter(filter);
    await this.getList();
    this.setLoading(false);
  }

  public mapFilters<R>(callback: (filter: WarehouseFilter) => R) {
    return this.filterManager.mapFilters(callback);
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  public isLoading() {
    return this.loading;
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  public isInitialized() {
    return this.initialized;
  }

  public getOrder() {
    return this.order;
  }
}

export default BagEdit;

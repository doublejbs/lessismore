import dayjs from 'dayjs';
import { makeAutoObservable } from 'mobx';
import { Location, NavigateFunction } from 'react-router-dom';
import app from '../../App';
import BagStore from '../../firebase/BagStore';
import Firebase from '../../firebase/Firebase';
import GearStore from '../../firebase/GearStore';
import Gear from '../../model/Gear';
import Order from '../../order/Order';
import GearFilter from '../../warehouse/model/GearFilter';
import WarehouseFilter from '../../warehouse/model/WarehouseFilter';
import BagDetailFilterManager from './BagDetailFilterManager';

class BagDetail {
  private static readonly ORDER_KEY = 'bag';

  public static from(navigate: NavigateFunction, location: Location, id: string) {
    return new BagDetail(
      navigate,
      location,
      id,
      app.getBagStore(),
      app.getGearStore(),
      BagDetailFilterManager.from(),
      Order.new(BagDetail.ORDER_KEY),
      app.getFirebase()
    );
  }

  private name: string = '';
  private weight: string = '';
  private gears: Gear[] = [];
  private toRemoveGears: Gear[] = [];
  private toAddGears: Gear[] = [];
  private warehouseVisible = false;
  private searchVisible = false;
  private initialized = false;
  private editDate = dayjs();
  private usedWeight = 0;
  private uselessChecked = false;
  private loading = false;
  private startDate = dayjs();
  private endDate = dayjs();
  private shared = false;
  private categoryRefs: Map<string, HTMLDivElement> = new Map();

  private constructor(
    private readonly navigate: NavigateFunction,
    private readonly location: Location,
    private readonly id: string,
    private readonly bagStore: BagStore,
    private readonly gearStore: GearStore,
    private readonly filterManager: BagDetailFilterManager,
    private readonly order: Order,
    private readonly firebase: Firebase
  ) {
    makeAutoObservable(this);
  }

  public async initialize() {
    this.order.initialize();
    const { name, weight, editDate, gears, startDate, endDate, shared } =
      await this.bagStore.getBagWithAllFilter(this.id);
    this.setName(name);
    this.setWeight(weight);
    this.setEditDate(editDate);
    this.setGears(gears);
    this.setStartDate(startDate);
    this.setEndDate(endDate);
    this.setShared(shared);
    this.calculateUsedWeight();
    this.updateUselessChecked();
    this.setInitialized(true);
  }

  private updateUselessChecked() {
    this.setUselessChecked(
      this.gears.some((gear) => gear.hasUseless(this.id) || gear.hasUsed(this.id))
    );
  }

  private calculateUsedWeight() {
    const usedWeight = this.gears.reduce(
      (acc: number, gear) => (gear.hasUsed(this.id) ? acc + Number(gear.getWeight()) : acc),
      0
    );
    this.setUsedWeight(usedWeight);
  }

  private setName(value: string) {
    this.name = value;
  }

  public getName() {
    return this.name;
  }

  private setWeight(value: string) {
    this.weight = value;
  }

  public getWeight() {
    return Number(this.weight) / 1000;
  }

  private setGears(value: Gear[]) {
    this.gears = value;
  }

  public getGears() {
    return this.gears;
  }

  private updateWeight() {
    const totalWeight = this.gears.reduce((acc: number, gear) => acc + Number(gear.getWeight()), 0);
    this.setWeight(totalWeight.toString());
  }

  public hasGearWith(id: string) {
    return this.gears.some((gear) => gear.hasId(id));
  }

  public shouldShowWarehouse() {
    return this.warehouseVisible;
  }

  public shouldShowSearch() {
    return this.searchVisible;
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  public isInitialized() {
    return this.initialized;
  }

  public async toggleUseless(gear: Gear) {
    if (this.isUseless(gear)) {
      await this.setUseful(gear);
    } else {
      await this.setUseless(gear);
    }
    await this.initialize();
  }

  private async setUseful(gear: Gear) {
    await this.gearStore.update(gear.removeUseless(this.id));
  }

  private async setUseless(gear: Gear) {
    await this.gearStore.update(gear.appendUseless(this.id));
  }

  public isUseless(gear: Gear) {
    return gear.hasUseless(this.id);
  }

  public getId() {
    return this.id;
  }

  private setEditDate(value: string) {
    this.editDate = dayjs(value);
  }

  public getEditDate() {
    return this.editDate;
  }

  public getCount() {
    return this.gears.length;
  }

  public showSearch() {
    this.navigate(`/bag/${this.id}/edit/search`, { state: { from: '/bag' } });
  }

  public showWrite() {
    this.navigate(`/warehouse/custom`, { state: { from: '/bag' } });
  }

  public async delete(gear: Gear) {
    const filteredGears = this.gears.filter((g) => !g.isSame(gear));

    await this.bagStore.save(this.id, this.toAddGears, [gear], filteredGears);
    this.setGears(filteredGears);
    this.updateWeight();
  }

  private setUsedWeight(value: number) {
    this.usedWeight = value;
  }

  public getUsedWeight() {
    return Number(this.usedWeight) / 1000;
  }

  private setUselessChecked(value: boolean) {
    this.uselessChecked = value;
  }

  public isUselessChecked() {
    return this.uselessChecked;
  }

  public async selectFilter(filter: WarehouseFilter) {
    this.setLoading(true);
    this.filterManager.selectFilter(filter);
    this.setLoading(false);
  }

  public async deselectFilter(filter: WarehouseFilter) {
    this.setLoading(true);
    this.filterManager.deselectFilter(filter);
    this.setLoading(false);
  }

  public isLoading() {
    return this.loading;
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  public mapFilters<R>(callback: (filter: WarehouseFilter) => R) {
    return this.filterManager.mapFilters(callback);
  }

  public mapFiltersWithGears<R>(callback: (filter: WarehouseFilter) => R) {
    return this.filterManager.getFiltersWithGears(this.gears).map(callback);
  }

  public toggleFilter(filter: WarehouseFilter) {
    if (filter.isSelected()) {
      this.deselectFilter(filter);
    } else {
      this.selectFilter(filter);
    }
  }

  public mapGears<R>(callback: (gear: Gear) => R) {
    return this.gears
      .filter((gear) => this.filterManager.hasFilter(gear.getCategory() as GearFilter))
      .map(callback);
  }

  public getGearsByCategory() {
    return this.filterManager.groupGearsByCategory(this.gears);
  }

  private setStartDate(value: string) {
    this.startDate = dayjs(value);
  }

  public getStartDate() {
    return this.startDate;
  }

  private setEndDate(value: string) {
    this.endDate = dayjs(value);
  }

  public getEndDate() {
    return this.endDate;
  }

  public getDate() {
    if (this.startDate.isSame(this.endDate, 'day')) {
      return this.startDate.format('YYYY.MM.DD');
    } else {
      return `${this.startDate.format('YYYY.MM.DD')} ~ ${this.endDate.format('YYYY.MM.DD')}`;
    }
  }

  public back() {
    const fromPath = this.location.state?.from;

    if (fromPath?.includes('/bag')) {
      this.navigate(-1);
    } else {
      this.navigate('/bag');
    }
  }

  public getOrder() {
    return this.order;
  }

  private setShared(value: boolean) {
    this.shared = value;
  }

  public isShared() {
    return this.shared;
  }

  public async share() {
    await this.bagStore.updateShared(this.id, this.firebase.getUserId(), true);
    this.setShared(true);
  }

  public async unshare() {
    await this.bagStore.updateShared(this.id, this.firebase.getUserId(), false);
    window.alert('공유가 취소되었습니다.');
    this.setShared(false);
  }

  public getUrl() {
    return `${window.location.origin}/bag-share/${this.id}`;
  }

  public setActiveFilterByCategory(categoryFilter: GearFilter) {
    // 모든 필터를 비활성화
    this.filterManager.mapFilters(filter => filter.deselect());
    
    // 해당 카테고리 필터만 활성화
    this.filterManager.mapFilters(filter => {
      if (filter.isSame(categoryFilter)) {
        filter.select();
      }
    });
  }

  public clearAllFilters() {
    this.filterManager.mapFilters(filter => filter.deselect());
  }

  public setCategoryRefs(refs: Map<string, HTMLDivElement>) {
    this.categoryRefs = refs;
  }

  public scrollToCategory(categoryFilter: GearFilter) {
    const element = this.categoryRefs.get(categoryFilter);
    if (element) {
      const y = element.getBoundingClientRect().top + window.pageYOffset - 170.5;
      
      window.scrollTo({
        top: y,
        behavior: 'smooth'
      });
    }
  }

  public toggleFilterWithScroll(filter: WarehouseFilter) {
    // 필터를 선택하고 해당 카테고리로 스크롤
    this.selectFilter(filter);
    this.scrollToCategory(filter.getFilter());
  }

  public async updateName(name: string) {
    await this.bagStore.updateName(this.id, name);
    this.setName(name);
  }

  public async updateDates(startDate: string, endDate: string) {
    await this.bagStore.updateDates(this.id, startDate, endDate);
    this.setStartDate(startDate);
    this.setEndDate(endDate);
  }
}

export default BagDetail;

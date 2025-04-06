import { makeAutoObservable } from 'mobx';
import app from '../../App';
import Gear from '../../model/Gear';
import BagStore from '../../firebase/BagStore';
import GearStore from '../../firebase/GearStore';
import dayjs from 'dayjs';
import { Location, NavigateFunction } from 'react-router-dom';

class BagEdit {
  public static from(navigate: NavigateFunction, location: Location, id: string) {
    return new BagEdit(navigate, location, id, app.getBagStore(), app.getGearStore());
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

  private constructor(
    private readonly navigate: NavigateFunction,
    private readonly location: Location,
    private readonly id: string,
    private readonly bagStore: BagStore,
    private readonly gearStore: GearStore,
  ) {
    makeAutoObservable(this);
  }

  public async initialize() {
    const { name, weight, editDate, gears } = await this.bagStore.getBag(this.id);
    this.setName(name);
    this.setWeight(weight);
    this.setEditDate(editDate);
    this.setGears(gears);
    this.setInitialized(true);
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

  public addGear(gear: Gear) {
    if (this.hasGear(gear)) {
      return;
    }

    this.gears.push(gear);
    this.toAddGears.push(gear);
    this.toRemoveGears = this.toRemoveGears.filter((g) => !g.isSame(gear));
    this.updateWeight();
  }

  public removeGear(gear: Gear) {
    this.gears = this.gears.filter((g) => !g.isSame(gear));
    this.toAddGears = this.toAddGears.filter((g) => !g.isSame(gear));
    this.toRemoveGears.push(gear);
    this.updateWeight();
  }

  private updateWeight() {
    const totalWeight = this.gears.reduce((acc: number, gear) => acc + Number(gear.getWeight()), 0);
    this.setWeight(totalWeight.toString());
  }

  public hasGear(gear: Gear) {
    return this.gears.some((g) => g.isSame(gear));
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

  public async save() {
    await this.bagStore.save(this.id, this.toAddGears, this.toRemoveGears, this.gears);
    this.back();
  }

  public back() {
    if (this.location.state?.from === '/bag') {
      this.navigate(`/bag/${this.id}/edit`);
    } else {
      this.navigate(-1);
    }
  }

  public showSearch() {
    this.navigate(`/bag/${this.id}/edit/search`, { state: { from: '/bag' } });
  }

  public showWrite() {
    this.navigate(`/warehouse/custom`, { state: { from: '/bag' } });
  }
}

export default BagEdit;

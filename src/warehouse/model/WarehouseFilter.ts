import GearFilter from './GearFilter.ts';
import { makeAutoObservable } from 'mobx';

class WarehouseFilter {
  public static from(filter: GearFilter, name: string) {
    return new WarehouseFilter(filter, name);
  }

  private selected = false;
  private count = 0;

  private constructor(
    private readonly filter: GearFilter,
    private readonly name: string,
  ) {
    makeAutoObservable(this);
  }

  public getName() {
    return this.name;
  }

  public select() {
    this.selected = true;
  }

  public deselect() {
    this.selected = false;
  }

  public isSelected() {
    return this.selected;
  }

  public getFilter() {
    return this.filter;
  }

  public isSame(filter: GearFilter) {
    return this.filter === filter;
  }

  private setCount(value: number) {
    this.count = value;
  }

  public getCount() {
    return this.count;
  }

  public plusCount() {
    this.setCount(this.count + 1);
  }

  public minusCount() {
    this.setCount(this.count - 1);
  }

  public resetCount() {
    this.setCount(0);
  }
}

export default WarehouseFilter;

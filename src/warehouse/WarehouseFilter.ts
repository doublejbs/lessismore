import GearFilter from './GearFilter.ts';
import { makeAutoObservable } from 'mobx';

class WarehouseFilter {
  public static from(filter: GearFilter, name: string) {
    return new WarehouseFilter(filter, name);
  }

  private selected = false;

  private constructor(
    private readonly filter: GearFilter,
    private readonly name: string
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
}

export default WarehouseFilter;

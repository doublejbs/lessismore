import { makeAutoObservable } from 'mobx';
import OrderType from './OrderType';

class OrderOption {
  public static from(name: string, order: OrderType) {
    return new OrderOption(name, order);
  }

  private selected = false;

  private constructor(
    private name: string,
    private order: OrderType
  ) {
    makeAutoObservable(this);
  }

  public getName() {
    return this.name;
  }

  public getOrder() {
    return this.order;
  }

  public isSelected() {
    return this.selected;
  }

  public select() {
    this.selected = true;
  }

  public deselect() {
    this.selected = false;
  }

  public equals(orderOption: OrderOption) {
    return this.getOrder() === orderOption.getOrder();
  }
}

export default OrderOption;

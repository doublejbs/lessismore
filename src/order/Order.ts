import { makeAutoObservable } from 'mobx';
import OrderOption from './OrderOption';
import OrderType from './OrderType';

class Order {
  public static new() {
    return new Order();
  }

  private showOrderOptions = false;
  private orderOptions: OrderOption[] = [
    {
      name: '이름순',
      order: OrderType.NameAsc,
    },
    {
      name: '가벼운순',
      order: OrderType.WeightAsc,
    },
    {
      name: '무거운순',
      order: OrderType.WeightDesc,
    },
    {
      name: '최근 추가순',
      order: OrderType.CreatedDesc,
    },
  ].map((option) => OrderOption.from(option.name, option.order));

  private constructor() {
    makeAutoObservable(this);
    this.orderOptions[0].select();
  }

  public isShowOrderOptions() {
    return this.showOrderOptions;
  }

  public toggleOrderOptions() {
    this.setShowOrderOptions(!this.showOrderOptions);
  }

  private setShowOrderOptions(showOrderOptions: boolean) {
    this.showOrderOptions = showOrderOptions;
  }

  public getSelectedOrderName() {
    return this.orderOptions.find((option) => option.isSelected())?.getName();
  }

  public mapOrderOptions<R>(callback: (option: OrderOption) => R) {
    return this.orderOptions.map(callback);
  }

  public setOrderOption(orderOption: OrderOption) {
    this.orderOptions.forEach((option) => option.deselect());
    this.orderOptions.find((option) => option.equals(orderOption))?.select();
    this.setShowOrderOptions(false);
  }

  public getSelectedOrderType() {
    return this.orderOptions.find((option) => option.isSelected())?.getOrder();
  }
}

export default Order;

import Gear from '../../model/Gear.ts';
import GearFilter from './GearFilter.ts';
import OrderType from '../../order/OrderType.ts';
interface WarehouseDispatcherType {
  getList(filters: GearFilter[], order: OrderType): Promise<Gear[]>;
  remove(gear: Gear): Promise<void>;
}

export default WarehouseDispatcherType;

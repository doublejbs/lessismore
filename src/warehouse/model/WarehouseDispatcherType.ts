import Gear from '../../model/Gear.ts';
import GearFilter from './GearFilter.ts';

interface WarehouseDispatcherType {
  getList(filters: GearFilter[]): Promise<Gear[]>;
  remove(gear: Gear): Promise<void>;
}

export default WarehouseDispatcherType;

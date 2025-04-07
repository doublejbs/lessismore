import WarehouseDispatcherType from './WarehouseDispatcherType.ts';
import GearFilter from './GearFilter.ts';
import Gear from '../../model/Gear.ts';
import GearStore from '../../firebase/GearStore.ts';
import app from '../../App.ts';

class WarehouseDispatcher implements WarehouseDispatcherType {
  public static new() {
    return new WarehouseDispatcher(app.getGearStore());
  }

  private constructor(private readonly gearStore: GearStore) {}

  public async getList(filters: GearFilter[]): Promise<Gear[]> {
    return await this.gearStore.getList(filters);
  }

  public async remove(gear: Gear): Promise<void> {
    return await this.gearStore.remove(gear);
  }
}

export default WarehouseDispatcher;

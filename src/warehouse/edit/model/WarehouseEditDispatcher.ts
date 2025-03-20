import GearStore from '../../../firebase/GearStore.ts';
import Gear from '../../../model/Gear.ts';

class WarehouseEditDispatcher {
  public static from(gearStore: GearStore) {
    return new WarehouseEditDispatcher(gearStore);
  }

  private constructor(private readonly gearStore: GearStore) {}

  public async update(gear: Gear) {
    await this.gearStore.update(gear);
  }
}

export default WarehouseEditDispatcher;

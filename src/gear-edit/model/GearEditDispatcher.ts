import GearStore from '../../firebase/GearStore.ts';
import Gear from '../../model/Gear.ts';
import app from '../../App';

class GearEditDispatcher {
  public static new() {
    return new GearEditDispatcher(app.getGearStore());
  }

  private constructor(private readonly gearStore: GearStore) {}

  public async getGear(id: string): Promise<Gear> {
    return await this.gearStore.getGear(id);
  }

  public async update(gear: Gear) {
    await this.gearStore.update(gear);
  }
}

export default GearEditDispatcher;

import GearStore from '../../firebase/GearStore.ts';
import Gear from '../../model/Gear.ts';
import app from '../../App';
import BagStore from '../../firebase/BagStore.ts';

class GearEditDispatcher {
  public static new() {
    return new GearEditDispatcher(app.getGearStore(), app.getBagStore());
  }

  private constructor(
    private readonly gearStore: GearStore,
    private readonly bagStore: BagStore,
  ) {}

  public async getGear(id: string): Promise<Gear> {
    return await this.gearStore.getGear(id);
  }

  public async update(gear: Gear) {
    await this.gearStore.update(gear);
  }

  public async updateBagWeight(bags: string[], gear: Gear) {
    if (bags.length) {
      await this.bagStore.updateBagsWeight(bags, Number(gear.getWeight()));
    }
  }
}

export default GearEditDispatcher;

import Gear from './Gear';
import app from '../App';
import GearStore from '../firebase/GearStore';
import Search from './Search';

class SearchWarehouse extends Search {
  public static new() {
    return new SearchWarehouse(app.getGearStore());
  }

  protected constructor(gearStore: GearStore) {
    super(gearStore);
  }

  public async select(value: Gear) {
    await this.register([value]);
    await this.search(this.getKeyword());
  }

  public async deselect(value: Gear) {
    await this.remove(value);
    await this.search(this.getKeyword());
  }
}

export default SearchWarehouse;

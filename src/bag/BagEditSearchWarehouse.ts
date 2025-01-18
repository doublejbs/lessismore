import Search from '../search-warehouse/Search';
import app from '../App';
import GearStore from '../firebase/GearStore';

class BagEditSearchWarehouse extends Search {
  public static new() {
    return new BagEditSearchWarehouse(app.getGearStore());
  }

  private constructor(gearStore: GearStore) {
    super(gearStore);
  }
}

export default BagEditSearchWarehouse;

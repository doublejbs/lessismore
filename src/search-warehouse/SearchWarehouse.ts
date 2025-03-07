import Gear from './Gear';
import app from '../App';
import GearStore from '../firebase/GearStore';
import Search from './Search';

class SearchWarehouse extends Search {
  public static new() {
    return new SearchWarehouse(app.getGearStore());
  }

  protected constructor(private readonly gearStore: GearStore) {
    super();
  }

  public async deselect(gear: Gear) {
    await this.gearStore.remove(gear);
    await this.search(this.getKeyword());
  }

  public async select(gear: Gear) {
    await this.gearStore.register([gear]);
    await this.search(this.getKeyword());
  }

  public async searchAll(): Promise<Gear[]> {
    return await this.gearStore.searchAll();
  }

  public async searchAllMore(): Promise<Gear[]> {
    return await this.gearStore.searchAllMore();
  }

  public async searchList(keyword: string): Promise<Gear[]> {
    return await this.gearStore.searchList(keyword);
  }

  public async searchListMore(keyword: string): Promise<Gear[]> {
    return await this.gearStore.searchListMore(keyword);
  }
}

export default SearchWarehouse;

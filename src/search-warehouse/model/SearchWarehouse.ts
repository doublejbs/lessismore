import Gear from '../../model/Gear';
import app from '../../App';
import GearStore from '../../firebase/GearStore';
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

  public async searchList(
    keyword: string
  ): Promise<{ gears: Gear[]; hasMore: boolean }> {
    return await this.gearStore.searchList(keyword);
  }

  public async searchListMore(
    keyword: string
  ): Promise<{ gears: Gear[]; hasMore: boolean }> {
    return await this.gearStore.searchListMore(keyword);
  }
}

export default SearchWarehouse;

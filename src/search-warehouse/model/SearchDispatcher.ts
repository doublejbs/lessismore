import SearchDispatcherType from './SearchDispatcherType';
import Gear from '../../model/Gear';
import GearStore from '../../firebase/GearStore';
import SearchStore from '../../firebase/SearchStore';
import app from '../../App';

class SearchDispatcher implements SearchDispatcherType {
  public static new() {
    return new SearchDispatcher(app.getGearStore(), app.getSearchStore());
  }

  private constructor(
    private readonly gearStore: GearStore,
    private readonly searchStore: SearchStore
  ) {}

  public async register(gears: Gear[]): Promise<void> {
    await this.gearStore.register(gears);
  }

  public async remove(gear: Gear): Promise<void> {
    await this.gearStore.remove(gear);
  }

  public async searchList(
    keyword: string,
    index: number
  ): Promise<{ gears: Gear[]; hasMore: boolean }> {
    return await this.searchStore.searchList(keyword, index);
  }
}

export default SearchDispatcher;

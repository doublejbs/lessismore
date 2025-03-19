import Gear from '../../model/Gear';

interface SearchDispatcherType {
  remove(gear: Gear): Promise<void>;
  register(gears: Gear[]): Promise<void>;
  searchList(
    keyword: string,
    index: number
  ): Promise<{ gears: Gear[]; hasMore: boolean }>;
}

export default SearchDispatcherType;

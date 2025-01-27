import Search from '../../search-warehouse/Search.ts';
import Gear from '../../search-warehouse/Gear.ts';
import BagEdit from '../BagEdit.ts';
import SearchStore from '../../firebase/SearchStore.ts';
import app from '../../App.ts';

class BagEditSearchWarehouse extends Search {
  public static from(bagEdit: BagEdit) {
    return new BagEditSearchWarehouse(bagEdit, app.getSearchStore());
  }

  private constructor(
    private readonly bagEdit: BagEdit,
    private readonly searchStore: SearchStore
  ) {
    super();
  }

  public async select(gear: Gear): Promise<void> {
    await this.bagEdit.addGear(gear);
    await this.refresh();
  }

  public async deselect(gear: Gear): Promise<void> {
    await this.bagEdit.removeGear(gear);
    await this.refresh();
  }

  public async searchAll(): Promise<Gear[]> {
    return (await this.searchStore.searchAll()).map(
      ({ name, weight, company, id, imageUrl }) => {
        return new Gear(
          id,
          name,
          company,
          weight,
          imageUrl,
          this.bagEdit.hasGearWith(id)
        );
      }
    );
  }

  public async searchList(keyword: string): Promise<Gear[]> {
    return (await this.searchStore.searchList(keyword)).map(
      ({ name, weight, company, id, imageUrl }) => {
        return new Gear(
          id,
          name,
          company,
          weight,
          imageUrl,
          this.bagEdit.hasGearWith(id)
        );
      }
    );
  }
}

export default BagEditSearchWarehouse;

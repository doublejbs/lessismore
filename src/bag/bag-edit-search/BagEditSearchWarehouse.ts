import Search from '../../search-warehouse/model/Search.ts';
import Gear from '../../model/Gear.ts';
import app from '../../App.ts';
import GearStore from '../../firebase/GearStore.ts';
import BagEdit from '../model/BagEdit';

class BagEditSearchWarehouse extends Search {
  public static from(bagEdit: BagEdit) {
    return new BagEditSearchWarehouse(bagEdit, app.getGearStore());
  }

  private constructor(
    private readonly bagEdit: BagEdit,
    private readonly gearStore: GearStore
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
    return (await this.gearStore.searchAll()).map((gear) => {
      return new Gear(
        gear.getId(),
        gear.getName(),
        gear.getCompany(),
        gear.getWeight(),
        gear.getImageUrl(),
        this.bagEdit.hasGearWith(gear.getId()),
        false,
        gear.getCategory(),
        gear.getSubCategory()
      );
    });
  }

  public async searchAllMore(): Promise<Gear[]> {
    return (await this.gearStore.searchAllMore()).map((gear) => {
      return new Gear(
        gear.getId(),
        gear.getName(),
        gear.getCompany(),
        gear.getWeight(),
        gear.getImageUrl(),
        this.bagEdit.hasGearWith(gear.getId()),
        false,
        gear.getCategory(),
        gear.getSubCategory()
      );
    });
  }

  public async searchList(keyword: string): Promise<Gear[]> {
    return (await this.gearStore.searchList(keyword)).map((gear) => {
      return new Gear(
        gear.getId(),
        gear.getName(),
        gear.getCompany(),
        gear.getWeight(),
        gear.getImageUrl(),
        this.bagEdit.hasGearWith(gear.getId()),
        false,
        gear.getCategory(),
        gear.getSubCategory()
      );
    });
  }

  public async searchListMore(keyword: string): Promise<Gear[]> {
    return (await this.gearStore.searchListMore(keyword)).map((gear) => {
      return new Gear(
        gear.getId(),
        gear.getName(),
        gear.getCompany(),
        gear.getWeight(),
        gear.getImageUrl(),
        this.bagEdit.hasGearWith(gear.getId()),
        false,
        gear.getCategory(),
        gear.getSubCategory()
      );
    });
  }
}

export default BagEditSearchWarehouse;

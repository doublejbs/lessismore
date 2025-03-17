import { action, makeObservable } from 'mobx';
import GearEdit from '../../custom-gear/model/GearEdit';
import CustomGearCategory from '../../custom-gear/model/CustomGearCategory';
import Gear from '../../../model/Gear';
import GearFilter from '../../model/GearFilter.ts';
import GearStore from '../../../firebase/GearStore';

class WarehouseEdit extends GearEdit {
  public static new(gearStore: GearStore) {
    return new WarehouseEdit(gearStore, CustomGearCategory.new());
  }

  private gear: Gear | null = null;
  private onRegister: (gear: Gear) => Promise<void> = async () => {};

  private constructor(
    private readonly gearStore: GearStore,
    category: CustomGearCategory
  ) {
    super(category, '', '', '');
    makeObservable(this);
  }

  public open(gear: Gear, onRegister: (gear: Gear) => Promise<void>) {
    this.setGear(gear);
    this.setName(gear.getName());
    this.setWeight(gear.getWeight());
    this.setCompany(gear.getCompany());
    this.setPreviewSrc(gear.getImageUrl());
    this.selectFilterWith(gear.getSubCategory() as GearFilter);
    this.onRegister = onRegister;
    this.show();
  }

  protected async _register(): Promise<void> {
    const updatedGear = new Gear(
      this.gear?.getId() ?? '',
      this.getName(),
      this.getCompany(),
      this.getWeight(),
      this.getPreviewSrc(),
      true,
      false,
      this.getSelectedFirstCategory(),
      this.getSelectedFilter(),
      this.gear?.getUseless() ?? [],
      this.gear?.getBags() ?? []
    );

    await this.gearStore.update(updatedGear);
    await this.onRegister(updatedGear);
  }

  @action
  private setGear(gear: Gear) {
    this.gear = gear;
  }
}

export default WarehouseEdit;

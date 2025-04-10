import { action, makeObservable, observable } from 'mobx';
import AbstractGearEdit from '../../custom-gear/model/AbstractGearEdit';
import CustomGearCategory from '../../custom-gear/model/CustomGearCategory';
import Gear from '../../model/Gear';
import GearFilter from '../../warehouse/model/GearFilter.ts';
import GearEditDispatcher from './GearEditDispatcher.ts';
import { NavigateFunction } from 'react-router-dom';

class GearEdit extends AbstractGearEdit {
  public static from(
    dispatcher: GearEditDispatcher,
    navigate: NavigateFunction,
    category: CustomGearCategory,
  ) {
    return new GearEdit(dispatcher, navigate, category);
  }

  private gear: Gear | null = null;
  @observable private initialized = false;
  @observable private initialWeight = '';
  private onRegister: (gear: Gear) => Promise<void> = async () => {};

  private constructor(
    private readonly dispatcher: GearEditDispatcher,
    private readonly navigate: NavigateFunction,
    category: CustomGearCategory,
  ) {
    super(category, '', '', '');
    makeObservable(this);
  }

  public async initialize(id: string) {
    this.setGear(await this.dispatcher.getGear(id));

    if (this.gear) {
      this.setName(this.gear.getName());
      this.setWeight(this.gear.getWeight());
      this.setInitialWeight(this.gear.getWeight());
      this.setCompany(this.gear.getCompany());
      this.setPreviewSrc(this.gear.getImageUrl());
      this.selectFilterWith(this.gear.getSubCategory() as GearFilter);
      this.setInitialized(true);
    }
  }

  protected async _register(): Promise<void> {
    const updatedGear = new Gear(
      this.gear?.getId() ?? '',
      this.getName(),
      this.getCompany(),
      this.getWeight(),
      ((await this.getFileUrl()) || this.gear?.getImageUrl()) ?? '',
      true,
      this.gear?.getIsCustom() ?? false,
      this.getSelectedFirstCategory(),
      this.getSelectedFilter(),
      this.gear?.getUseless() ?? [],
      this.gear?.getUsed() ?? [],
      this.gear?.getBags() ?? [],
      this.gear?.getCreateDate() ?? Date.now(),
    );

    await this.dispatcher.update(updatedGear);

    if (this.initialWeight !== updatedGear.getWeight()) {
      await this.dispatcher.updateBagWeight(this.gear?.getBags() ?? [], updatedGear);
    }

    await this.onRegister(updatedGear);
  }

  @action
  private setGear(gear: Gear) {
    this.gear = gear;
  }

  @action
  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  public isInitialized() {
    return this.initialized;
  }

  public override hide(): void {
    this.navigate(-1);
  }

  @action
  private setInitialWeight(weight: string) {
    this.initialWeight = weight;
  }
}

export default GearEdit;

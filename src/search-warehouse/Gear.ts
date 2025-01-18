class Gear {
  public constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly company: string,
    private readonly weight: string,
    private readonly imageUrl: string,
    private readonly added: boolean,
    private readonly isCustom: boolean = false
  ) {}

  public hasId(value: string) {
    return this.getId() === value;
  }

  public isSame(value: Gear) {
    return this.getId() === value.getId();
  }

  public getName() {
    return this.name;
  }

  public getCompany() {
    return this.company;
  }

  public getWeight() {
    return this.weight;
  }

  public getImageUrl() {
    return this.imageUrl;
  }

  public getId() {
    return this.id;
  }

  public getData() {
    return {
      id: this.id,
      name: this.name,
      company: this.company,
      weight: this.weight,
      imageUrl: this.imageUrl,
      isCustom: this.isCustom,
    };
  }

  public isAdded() {
    return this.added;
  }
}

export default Gear;

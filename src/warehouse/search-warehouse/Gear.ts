class Gear {
  public constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly company: string,
    private readonly weight: string,
    private readonly imageUrl: string
  ) {}

  public isSame(value: Gear) {
    return this.getId() === value.getId();
  }

  public getName() {
    return this.name;
  }

  public getCompany() {
    return this.company;
  }

  public geWeight() {
    return this.weight;
  }

  public getImageUrl() {
    return this.imageUrl;
  }

  public getId() {
    return this.id;
  }
}

export default Gear;

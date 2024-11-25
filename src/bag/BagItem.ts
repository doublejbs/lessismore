class BagItem {
  public constructor(
    private readonly id: string,
    private readonly name: string
  ) {}

  public getID() {
    return this.id;
  }

  public getName() {
    return this.name;
  }
}

export default BagItem;

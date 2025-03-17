class Gear {
  public constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly company: string,
    private readonly weight: string,
    private readonly imageUrl: string,
    private readonly added: boolean,
    private readonly isCustom: boolean,
    private readonly category: string,
    private readonly subCategory: string,
    private useless: string[],
    private bags: string[]
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

  public getCategory() {
    return this.category;
  }

  public getSubCategory() {
    return this.subCategory;
  }

  public getData() {
    return {
      id: this.id,
      name: this.name,
      company: this.company,
      weight: this.weight,
      imageUrl: this.imageUrl ?? '',
      isCustom: this.isCustom,
      category: this.category,
      subCategory: this.subCategory,
      useless: this.useless,
      bags: this.bags,
    };
  }

  public isAdded() {
    return this.added;
  }

  public removeUseless(value: string) {
    this.useless = this.useless.filter((useless) => useless !== value);
    return this;
  }

  public appendUseless(value: string) {
    if (this.useless.includes(value)) {
      return this;
    } else {
      this.useless.push(value);
      return this;
    }
  }

  public hasUseless(value: string) {
    return this.useless.includes(value);
  }

  public getUseless() {
    return this.useless;
  }

  public getBags() {
    return this.bags;
  }
}

export default Gear;

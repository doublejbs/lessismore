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
    private used: string[],
    private bags: string[],
    private createDate: number,
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
      used: this.used,
      bags: this.bags,
      createDate: this.createDate,
    };
  }

  public isAdded() {
    return this.added;
  }

  public removeUseless(value: string) {
    this.useless = this.useless.filter((useless) => useless !== value);

    if (this.used.includes(value)) {
      return this;
    } else {
      this.used.push(value);
      return this;
    }
  }

  public appendUseless(value: string) {
    this.used = this.used.filter((used) => used !== value);

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

  public hasUsed(value: string) {
    return this.used.includes(value);
  }

  public getUseless() {
    return this.useless;
  }

  public getBags() {
    return this.bags;
  }

  public getBagCount() {
    return this.bags.length;
  }

  public getUsedCount() {
    return this.used.length;
  }

  public getUselessCount() {
    return this.useless.length;
  }

  public getUsed() {
    return this.used;
  }

  public getCreateDate() {
    return this.createDate;
  }
}

export default Gear;

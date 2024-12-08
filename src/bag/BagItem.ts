import { Dayjs } from 'dayjs';

class BagItem {
  public constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly weight: string,
    private readonly editDate: Dayjs
  ) {}

  public getID() {
    return this.id;
  }

  public getName() {
    return this.name;
  }

  public getWeight() {
    return this.weight;
  }

  public getEditDate() {
    return this.editDate.format('YYYY.MM.DD HH:mm');
  }
}

export default BagItem;

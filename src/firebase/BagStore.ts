import Firebase from './Firebase';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  orderBy,
  query,
  QuerySnapshot,
  updateDoc,
  where,
} from 'firebase/firestore';
import BagItem from '../bag/BagItem.ts';
import GearStore, { GearData } from './GearStore.ts';
import dayjs from 'dayjs';
import Gear from '../search-warehouse/Gear';

class BagStore {
  public constructor(
    private readonly firebase: Firebase,
    private readonly gearStore: GearStore
  ) {}

  public async getList(): Promise<BagItem[]> {
    const bagIDs = (
      await getDoc(doc(this.getStore(), 'users', this.firebase.getUserId()))
    ).data()?.['bags'];

    if (!!bagIDs.length) {
      const bags = await getDocs(
        query(
          collection(this.getStore(), 'bag'),
          where('__name__', 'in', bagIDs),
          orderBy('editDate', 'desc')
        )
      );

      return this.convertToArray(bags);
    } else {
      return [];
    }
  }

  public async getBag(id: string) {
    const { name, weight, gears } = (
      await getDoc(doc(this.getStore(), 'bag', id))
    ).data() as { name: string; weight: string; gears: GearData[] };

    return {
      name,
      weight,
      gears: gears.length
        ? gears.map(
            ({ id, name, company, weight, imageUrl }) =>
              new Gear(id, name, company, weight, imageUrl, true)
          )
        : [],
    };
  }

  private convertToArray(data: QuerySnapshot<DocumentData, DocumentData>) {
    const result: BagItem[] = [];
    data.forEach((doc) => {
      const { name, weight, editDate } = doc.data();

      result.push(new BagItem(doc.id, name, weight, dayjs(editDate)));
    });
    return result;
  }

  public async add(value: string) {
    const docRef = await addDoc(collection(this.getStore(), 'bag'), {
      name: value,
      weight: '0',
      gears: [],
      editDate: new Date().toISOString(),
    });
    await updateDoc(doc(this.getStore(), 'users', this.getUserID()), {
      bags: arrayUnion(docRef.id),
    });
  }

  public async addGear(id: string, gear: Gear) {
    await updateDoc(doc(this.getStore(), 'bag', id), {
      gears: arrayUnion({ ...gear.getData() }),
    });
    await this.updateWeight(id);
  }

  public async removeGear(id: string, gear: Gear) {
    await updateDoc(doc(this.getStore(), 'bag', id), {
      gears: arrayRemove({ ...gear.getData() }),
    });
    await this.updateWeight(id);
  }

  private async updateWeight(id: string) {
    const { gears } = await this.getBag(id);
    const weight = gears.reduce(
      (acc, gear: Gear) => acc + parseInt(gear.getWeight()),
      0
    );

    await updateDoc(doc(this.getStore(), 'bag', id), {
      weight,
    });
  }

  public async delete(id: string) {
    await updateDoc(doc(this.getStore(), 'users', this.getUserID()), {
      bags: arrayRemove(id),
    });
  }

  private getStore() {
    return this.firebase.getStore();
  }

  private getUserID() {
    return this.firebase.getUserId();
  }
}

export default BagStore;

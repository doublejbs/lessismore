import Firebase from './Firebase';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  query,
  QuerySnapshot,
  updateDoc,
  where,
} from 'firebase/firestore';
import BagItem from '../bag/BagItem.ts';
import GearStore from './GearStore.ts';

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
          where('__name__', 'in', bagIDs)
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
    ).data() as { name: string; weight: string; gears: string[] };

    return {
      name,
      weight,
      gears: gears.length ? await this.gearStore.getGears(gears) : [],
    };
  }

  private convertToArray(data: QuerySnapshot<DocumentData, DocumentData>) {
    const result: BagItem[] = [];
    data.forEach((doc) => {
      const { name } = doc.data();
      result.push(new BagItem(doc.id, name));
    });
    return result;
  }

  public async add(value: string) {
    const docRef = await addDoc(collection(this.getStore(), 'bag'), {
      name: value,
      weight: '0',
      gears: [],
    });
    await updateDoc(doc(this.getStore(), 'users', this.getUserID()), {
      bags: arrayUnion(docRef.id),
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

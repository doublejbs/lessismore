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

class BagStore {
  public constructor(private readonly firebase: Firebase) {}

  public async getList(): Promise<BagItem[]> {
    const bagIDs = (
      await getDoc(doc(this.getStore(), 'users', this.firebase.getUserId()))
    ).data()?.['bags'];
    console.log(bagIDs);

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
    const { name, weight } = (
      await getDoc(doc(this.getStore(), 'bag', id))
    ).data() as { name: string; weight: string };

    return {
      name,
      weight,
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

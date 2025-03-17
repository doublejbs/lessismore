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
import GearStore, { GearData } from './GearStore.ts';
import dayjs from 'dayjs';
import Gear from '../model/Gear';
import BagItem from '../bag/model/BagItem';
import { runTransaction } from '@firebase/firestore';

class BagStore {
  public constructor(
    private readonly firebase: Firebase,
    private readonly gearStore: GearStore
  ) {}

  public async getList(): Promise<BagItem[]> {
    try {
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
    } catch (e) {
      console.log(e);
      return [];
    }
  }

  public async getBag(id: string) {
    const { name, weight, gears } = (
      await getDoc(doc(this.getStore(), 'bag', id))
    ).data() as {
      name: string;
      weight: string;
      gears: string[];
    };
    const warehouseSnapshot = await (gears.length
      ? getDocs(
          query(
            collection(this.getStore(), 'users', this.getUserID(), 'gears'),
            where('__name__', 'in', gears)
          )
        )
      : Promise.resolve({ docs: [] }));
    const warehouseGears = warehouseSnapshot.docs.map((doc) => ({
      ...(doc.data() as GearData),
      id: doc.id,
    }));

    return {
      name,
      weight,
      gears: warehouseGears.length
        ? warehouseGears.map(
            ({
              id,
              name,
              company,
              weight,
              imageUrl,
              category = '',
              subCategory = '',
              useless,
            }) =>
              new Gear(
                id,
                name,
                company,
                weight,
                imageUrl,
                true,
                false,
                category,
                subCategory,
                useless
              )
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
      weight: 0,
      gears: [],
      editDate: new Date().toISOString(),
    });
    await updateDoc(doc(this.getStore(), 'users', this.getUserID()), {
      bags: arrayUnion(docRef.id),
    });

    return docRef.id;
  }

  public async addGear(id: string, gear: Gear) {
    const bagRef = doc(this.getStore(), 'bag', id);

    try {
      await runTransaction(this.getStore(), async (transaction) => {
        const bagSnap = await transaction.get(bagRef);

        if (bagSnap.exists()) {
          const bagData = bagSnap.data();
          const currentWeight = bagData.weight || 0;

          transaction.update(bagRef, {
            weight: currentWeight + (parseInt(gear.getWeight()) || 0),
            gears: arrayUnion(gear.getId()),
          });
        }
      });
    } catch (e) {
      console.log(e);
    }
  }

  public async removeGear(id: string, gear: Gear) {
    const bagRef = doc(this.getStore(), 'bag', id);
    const gearRef = doc(
      this.getStore(),
      'users',
      this.getUserID(),
      'gears',
      gear.getId()
    );

    try {
      await runTransaction(this.getStore(), async (transaction) => {
        const bagSnap = await transaction.get(bagRef);
        const gearSnap = await transaction.get(gearRef);

        if (bagSnap.exists()) {
          const bagData = bagSnap.data();
          const currentWeight = bagData.weight || 0;

          transaction.update(bagRef, {
            weight: currentWeight - (parseInt(gear.getWeight()) || 0),
            gears: arrayRemove(gear.getId()),
          });
        }

        if (gearSnap.exists()) {
          transaction.update(gearRef, {
            useless: arrayRemove(id),
          });
        }
      });
    } catch (e) {
      console.log(e);
    }
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

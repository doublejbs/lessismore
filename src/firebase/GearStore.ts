import { collection, doc, getDoc, getDocs, query } from 'firebase/firestore';
import Firebase from './Firebase';
import Gear from '../model/Gear';
import {
  addDoc,
  arrayRemove,
  deleteDoc,
  orderBy,
  setDoc,
  where,
  writeBatch,
} from '@firebase/firestore';
import GearFilter from '../warehouse/model/GearFilter.ts';

export interface GearData {
  id: string;
  name: string;
  company: string;
  weight: string;
  imageUrl: string;
  isCustom: boolean;
  category: string;
  subCategory: string;
  useless: string[];
  used: string[];
  bags: string[];
}

class GearStore {
  public constructor(private readonly firebase: Firebase) {}

  public async getGear(id: string): Promise<Gear> {
    const docData = await getDoc(doc(this.getStore(), 'users', this.getUserId(), 'gears', id));

    if (docData.exists()) {
      const {
        name,
        company,
        weight,
        imageUrl,
        isCustom,
        category,
        subCategory,
        useless,
        used,
        bags,
      } = docData.data() as GearData;

      return new Gear(
        id,
        name,
        company,
        weight,
        imageUrl,
        true,
        isCustom,
        category,
        subCategory,
        useless,
        used,
        bags,
      );
    } else {
      throw Error('No Gear data found.');
    }
  }

  public async getList(filter: GearFilter): Promise<Gear[]> {
    const filterQuery =
      filter === GearFilter.All
        ? collection(this.getStore(), 'users', this.getUserId(), 'gears')
        : query(
            collection(this.getStore(), 'users', this.getUserId(), 'gears'),
            where('subCategory', '==', filter),
            orderBy('name', 'desc'),
          );
    const gears = (await getDocs(filterQuery)).docs;

    if (!!gears?.length) {
      return gears.map((doc) => {
        const {
          id,
          name,
          company,
          weight,
          imageUrl,
          isCustom,
          category,
          subCategory,
          useless,
          used,
          bags,
        } = doc.data();

        return new Gear(
          id,
          name,
          company,
          weight,
          imageUrl,
          true,
          isCustom,
          category,
          subCategory,
          useless,
          used,
          bags,
        );
      });
    } else {
      return [];
    }
  }

  public async register(value: Gear[]) {
    try {
      const batch = writeBatch(this.getStore());

      for (const gear of value) {
        const gearRef = doc(this.getStore(), 'users', this.getUserId(), 'gears', gear.getId());
        if ((await getDoc(gearRef)).exists()) {
        } else {
          batch.set(gearRef, gear.getData());
        }
      }

      await batch.commit();
    } catch (e) {
      console.log(e);
    }
  }

  public async update(gear: Gear) {
    try {
      const gearRef = doc(this.getStore(), 'users', this.getUserId(), 'gears', gear.getId());
      await setDoc(gearRef, gear.getData());
    } catch (error) {
      console.error('Error updating gear:', error);
    }
  }

  public async updateGears(gears: Gear[]) {
    const batch = writeBatch(this.getStore());
    for (const gear of gears) {
      const gearRef = doc(this.getStore(), 'users', this.getUserId(), 'gears', gear.getId());
      batch.update(gearRef, gear.getData());
    }
    await batch.commit();
  }

  public async remove(gear: Gear) {
    try {
      const gearRef = doc(this.getStore(), 'users', this.getUserId(), 'gears', gear.getId());
      const gearSnap = await getDoc(gearRef);

      if (!gearSnap.exists()) {
        console.error('Gear does not exist:', gear.getId());
        return;
      }

      const { bags, weight } = gearSnap.data() as GearData;
      const batch = writeBatch(this.getStore());

      for (const bagId of bags) {
        const bagRef = doc(this.getStore(), 'bag', bagId);
        const bagSnap = await getDoc(bagRef);

        if (bagSnap.exists()) {
          const bagData = bagSnap.data();
          const newWeight = Math.max(0, (bagData.weight || 0) - +weight);

          batch.update(bagRef, {
            weight: newWeight,
            gears: arrayRemove(gear.getId()),
          });
        }
      }
      await batch.commit();
      await deleteDoc(gearRef);
    } catch (error) {
      console.error('Error deleting gear:', error);
    }
  }

  private getStore() {
    return this.firebase.getStore();
  }

  private getUserId() {
    return this.firebase.getUserId();
  }

  public async add(value: Gear) {
    await addDoc(collection(this.getStore(), 'gear'), value.getData());
  }
}

export default GearStore;

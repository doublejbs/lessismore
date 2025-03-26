import {
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  query,
  QuerySnapshot,
} from 'firebase/firestore';
import { liteClient } from 'algoliasearch/lite';
import { SearchResponse } from 'algoliasearch';
import GearType from '../warehouse/type/GearType';
import Firebase from './Firebase';
import Gear from '../model/Gear';
import { addDoc, deleteDoc, orderBy, setDoc, where } from '@firebase/firestore';
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
  bags: string[];
}

class GearStore {
  public constructor(private readonly firebase: Firebase) {}

  public async getGear(id: string): Promise<Gear> {
    const docData = await getDoc(
      doc(this.getStore(), 'users', this.getUserId(), 'gears', id)
    );

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
        bags
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
            orderBy('name', 'desc')
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
          bags
        );
      });
    } else {
      return [];
    }
  }

  public async register(value: Gear[]) {
    try {
      for (const gear of value) {
        const gearRef = doc(
          this.getStore(),
          'users',
          this.getUserId(),
          'gears',
          gear.getId()
        );
        if ((await getDoc(gearRef)).exists()) {
        } else {
          return await setDoc(gearRef, gear.getData());
        }
      }
    } catch (e) {
      console.log(e);
    }
  }

  public async update(gear: Gear) {
    try {
      const gearRef = doc(
        this.getStore(),
        'users',
        this.getUserId(),
        'gears',
        gear.getId()
      );
      await setDoc(gearRef, gear.getData());
    } catch (error) {
      console.error('Error updating gear:', error);
    }
  }

  public async remove(gear: Gear) {
    try {
      const gearRef = doc(
        this.getStore(),
        'users',
        this.getUserId(),
        'gears',
        gear.getId()
      );
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

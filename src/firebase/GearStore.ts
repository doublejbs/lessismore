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
import GearFilter from '../warehouse/GearFilter.ts';

export interface GearData {
  id: string;
  name: string;
  company: string;
  weight: string;
  imageUrl: string;
  isCustom?: boolean;
  category?: string;
  subCategory?: string;
  useless: string[];
}

class GearStore {
  private readonly searchClient = liteClient(
    'RSDA6EDQZP',
    'e6231534c3832c1253d08ce1f2d3aaa7'
  );

  private lastDoc: DocumentData | null = null;
  private searchPage = 0;

  public constructor(private readonly firebase: Firebase) {}

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
          useless
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

  public async searchList(
    value: string
  ): Promise<{ gears: Gear[]; hasMore: boolean }> {
    const keyword = value.trim();
    this.searchPage = 0;
    const { results } = await this.searchClient.search<GearType>({
      requests: [
        {
          indexName: 'useless-lessismore-gear',
          query: keyword,
          page: this.searchPage,
          hitsPerPage: 100,
        },
      ],
    });
    const { hits, page, nbPages } = results[0] as SearchResponse<GearType>;

    this.searchPage += 1;

    return {
      gears: await this.convertWithMyGears(
        hits.map(({ name, weight, company, objectID, imageUrl }) => ({
          name,
          weight,
          company,
          id: objectID,
          imageUrl,
          useless: [],
        }))
      ),
      hasMore: page + 1 < nbPages,
    };
  }

  public async searchListMore(
    value: string
  ): Promise<{ gears: Gear[]; hasMore: boolean }> {
    const keyword = value.trim();
    const { results } = await this.searchClient.search<GearType>({
      requests: [
        {
          indexName: 'useless-lessismore-gear',
          query: keyword,
          page: this.searchPage,
          hitsPerPage: 100,
        },
      ],
    });
    const { hits, page, nbPages } = results[0] as SearchResponse<GearType>;

    this.searchPage += 1;

    return {
      gears: await this.convertWithMyGears(
        hits.map(({ name, weight, company, objectID, imageUrl }) => ({
          name,
          weight,
          company,
          id: objectID,
          imageUrl,
          useless: [],
        }))
      ),
      hasMore: page + 1 < nbPages,
    };
  }

  private async convertWithMyGears(data: Array<GearType>) {
    const myGears = await this.getList(GearFilter.All);

    return data
      .filter(({ id }) => !this.hasGear(id, myGears))
      .map(
        ({
          name,
          weight,
          company,
          id,
          imageUrl,
          category = '',
          subCategory = '',
          useless,
        }) => {
          return new Gear(
            id,
            name,
            company,
            weight,
            imageUrl,
            this.hasGear(id, myGears),
            false,
            category,
            subCategory,
            useless
          );
        }
      );
  }

  private hasGear(id: string, myGears: Gear[]) {
    return myGears.some((myGear) => {
      return myGear.hasId(id);
    });
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

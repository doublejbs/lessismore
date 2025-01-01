import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  DocumentData,
  Firestore,
  getDoc,
  getDocs,
  query,
  QuerySnapshot,
  updateDoc,
  where,
} from 'firebase/firestore';
import { liteClient } from 'algoliasearch/lite';
import { SearchResponse } from 'algoliasearch';
import Gear from '../warehouse/search-warehouse/Gear';
import GearType from '../warehouse/type/GearType';
import Firebase from './Firebase';

export interface GearData {
  id: string;
  name: string;
  company: string;
  weight: string;
  imageUrl: string;
}

class GearStore {
  private readonly searchClient = liteClient(
    'RSDA6EDQZP',
    'e6231534c3832c1253d08ce1f2d3aaa7'
  );

  public constructor(private readonly firebase: Firebase) {}

  public async getList(): Promise<Gear[]> {
    const gears = (
      await getDoc(doc(this.getStore(), 'users', this.getUserId()))
    ).data()?.['gears'];

    if (!!gears.length) {
      return gears.map(
        ({ id, name, company, weight, imageUrl }: GearData) =>
          new Gear(id, name, company, weight, imageUrl)
      );
    } else {
      return [];
    }
  }

  public async remove(gear: Gear) {
    await updateDoc(doc(this.getStore(), 'users', this.getUserId()), {
      gears: arrayRemove({ ...gear.getData() }),
    });
  }

  public async searchList(value: string): Promise<Gear[]> {
    const keyword = value.trim();
    const { results } = await this.searchClient.search<GearType>({
      requests: [
        {
          indexName: 'useless-lessismore-gear',
          query: keyword,
        },
      ],
    });

    return (results[0] as SearchResponse<GearType>).hits.map(
      ({ name, weight, company, objectID, imageUrl }) =>
        new Gear(objectID, name, company, weight, imageUrl)
    );
  }

  public async register(value: Gear[]) {
    await updateDoc(doc(this.getStore(), 'users', this.getUserId()), {
      gears: arrayUnion(
        ...value.map((data) => {
          return { ...data.getData() };
        })
      ),
    });
  }

  public async getAll() {
    const gears = await getDocs(query(collection(this.getStore(), 'gear')));
    return this.convertToArray(gears);
  }

  private convertToArray(data: QuerySnapshot<DocumentData, DocumentData>) {
    const result: Gear[] = [];
    data.forEach((doc) => {
      const { name, company, weight, imageUrl } = doc.data();
      result.push(new Gear(doc.id, name, company, weight, imageUrl));
    });
    return result;
  }

  private getStore() {
    return this.firebase.getStore();
  }

  private getUserId() {
    return this.firebase.getUserId();
  }
}

export default GearStore;

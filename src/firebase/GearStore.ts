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

class GearStore {
  private readonly searchClient = liteClient(
    'RSDA6EDQZP',
    'e6231534c3832c1253d08ce1f2d3aaa7'
  );

  public constructor(private readonly firebase: Firebase) {}

  public async getList(): Promise<Gear[]> {
    const gearIds = (
      await getDoc(doc(this.getStore(), 'users', this.getUserId()))
    ).data()?.['gears'];

    if (!!gearIds.length) {
      const gears = await getDocs(
        query(collection(this.getStore(), 'gear'), where('id', 'in', gearIds))
      );

      return this.convertToArray(gears);
    } else {
      return [];
    }
  }

  public async getGears(ids: string[]) {
    const gears = await getDocs(
      query(collection(this.getStore(), 'gear'), where('id', 'in', ids))
    );

    return this.convertToArray(gears);
  }

  public async remove(gear: Gear) {
    await updateDoc(doc(this.getStore(), 'users', this.getUserId()), {
      gears: arrayRemove(gear.getId()),
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
      ({ name, weight, company, id, imageUrl }) =>
        new Gear(id, name, company, weight, imageUrl)
    );
  }

  public async register(value: Gear[]) {
    await updateDoc(doc(this.getStore(), 'users', this.getUserId()), {
      gears: arrayUnion(...value.map((data) => data.getId())),
    });
  }

  public async getAll() {
    const gears = await getDocs(query(collection(this.getStore(), 'gear')));
    return this.convertToArray(gears);
  }

  private convertToArray(data: QuerySnapshot<DocumentData, DocumentData>) {
    const result: Gear[] = [];
    data.forEach((doc) => {
      const { name, company, weight, imageUrl, id } = doc.data();
      result.push(new Gear(id, name, company, weight, imageUrl));
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

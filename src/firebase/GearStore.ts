import {
  collection,
  doc,
  DocumentData,
  Firestore,
  getDoc,
  getDocs,
  orderBy,
  query,
  QuerySnapshot,
  where,
} from 'firebase/firestore';
import Gear from '../warehouse/type/GearType';
import { liteClient } from 'algoliasearch/lite';
import { SearchResponse, SearchResult } from 'algoliasearch';
import GearType from '../warehouse/type/GearType';

class GearStore {
  private readonly searchClient = liteClient(
    'RSDA6EDQZP',
    'e6231534c3832c1253d08ce1f2d3aaa7'
  );

  public constructor(
    private readonly store: Firestore,
    private readonly userId: string
  ) {}

  public async getList(): Promise<Gear[]> {
    const gearIds = (
      await getDoc(doc(this.store, 'users', this.userId))
    ).data()?.['gears'];
    const gears = await getDocs(
      query(collection(this.store, 'gear'), where('id', 'in', gearIds))
    );
    return this.convertToArray(gears);
  }

  public async searchList(value: string): Promise<Gear[]> {
    const keyword = value.trim();
    const { results } = await this.searchClient.search<Gear>({
      requests: [
        {
          indexName: 'useless-lessismore-gear',
          query: keyword,
        },
      ],
    });

    return (results[0] as SearchResponse<Gear>).hits.map((data) => ({
      name: data.name,
      weight: data.weight,
      company: data.company,
      id: data.objectID,
      imageUrl: data.imageUrl,
    }));
  }

  public async getAll() {
    const gears = await getDocs(query(collection(this.store, 'gear')));
    return this.convertToArray(gears);
  }

  private convertToArray(data: QuerySnapshot<DocumentData, DocumentData>) {
    const result: Gear[] = [];
    data.forEach((doc) => {
      result.push(doc.data() as Gear);
    });
    return result;
  }
}

export default GearStore;

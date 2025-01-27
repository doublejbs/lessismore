import { liteClient } from 'algoliasearch/lite';
import {
  collection,
  DocumentData,
  getDocs,
  query,
  QuerySnapshot,
} from '@firebase/firestore';
import Firebase from './Firebase.ts';
import GearType from '../warehouse/type/GearType.ts';
import { SearchResponse } from 'algoliasearch';

class SearchStore {
  private readonly searchClient = liteClient(
    'RSDA6EDQZP',
    'e6231534c3832c1253d08ce1f2d3aaa7'
  );

  public constructor(private readonly firebase: Firebase) {}

  public async searchAll() {
    const gears = await getDocs(query(collection(this.getStore(), 'gear')));
    return this.convertToArray(gears);
  }

  public async searchList(value: string): Promise<GearType[]> {
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
      ({ name, weight, company, objectID, imageUrl }) => ({
        name,
        weight,
        company,
        id: objectID,
        imageUrl,
      })
    );
  }

  private getStore() {
    return this.firebase.getStore();
  }

  private convertToArray(
    data: QuerySnapshot<DocumentData, DocumentData>
  ): GearType[] {
    const result: GearType[] = [];

    data.forEach((doc) => {
      const { name, company, weight, imageUrl } = doc.data();
      result.push({ id: doc.id, name, company, weight, imageUrl });
    });

    return result;
  }
}

export default SearchStore;

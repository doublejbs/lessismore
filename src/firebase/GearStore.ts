import {
  arrayUnion,
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  query,
  QuerySnapshot,
  updateDoc,
} from 'firebase/firestore';
import { liteClient } from 'algoliasearch/lite';
import { SearchResponse } from 'algoliasearch';
import GearType from '../warehouse/type/GearType';
import Firebase from './Firebase';
import Gear from '../search-warehouse/Gear';

export interface GearData {
  id: string;
  name: string;
  company: string;
  weight: string;
  imageUrl: string;
  isCustom?: boolean;
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
        ({ id, name, company, weight, imageUrl, isCustom = false }: GearData) =>
          new Gear(id, name, company, weight, imageUrl, isCustom)
      );
    } else {
      return [];
    }
  }

  public async remove(gear: Gear) {
    await updateDoc(doc(this.getStore(), 'users', this.getUserId()), {
      gears: (await this.getList())
        .filter((data) => !data.isSame(gear))
        .map((data) => data.getData()),
    });
  }

  public async searchAll() {
    const gears = await getDocs(query(collection(this.getStore(), 'gear')));
    return this.convertWithMyGears(this.convertToArray(gears));
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

    return this.convertWithMyGears(
      (results[0] as SearchResponse<GearType>).hits.map(
        ({ name, weight, company, objectID, imageUrl }) => ({
          name,
          weight,
          company,
          id: objectID,
          imageUrl,
        })
      )
    );
  }

  private async convertWithMyGears(data: Array<GearType>) {
    const myGears = await this.getList();

    return data.map(({ name, weight, company, id, imageUrl }) => {
      return new Gear(
        id,
        name,
        company,
        weight,
        imageUrl,
        this.hasGear(id, myGears)
      );
    });
  }

  private hasGear(id: string, myGears: Gear[]) {
    return myGears.some((myGear) => {
      return myGear.hasId(id);
    });
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

  private getStore() {
    return this.firebase.getStore();
  }

  private getUserId() {
    return this.firebase.getUserId();
  }
}

export default GearStore;

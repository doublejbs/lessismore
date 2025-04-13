import { liteClient } from 'algoliasearch/lite';
import { collection, getDocs, orderBy, query, where } from '@firebase/firestore';
import Firebase from './Firebase.ts';
import GearType from '../warehouse/type/GearType.ts';
import { SearchResponse } from 'algoliasearch';
import Gear from '../model/Gear';
import GearFilter from '../warehouse/model/GearFilter';

class SearchStore {
  private readonly searchClient = liteClient('RSDA6EDQZP', 'e6231534c3832c1253d08ce1f2d3aaa7');

  public constructor(private readonly firebase: Firebase) {}

  public async searchList(
    value: string,
    index: number
  ): Promise<{ gears: Gear[]; hasMore: boolean }> {
    const keyword = value.trim();
    const { results } = await this.searchClient.search<GearType>({
      requests: [
        {
          indexName: 'useless-lessismore-gear',
          query: keyword,
          page: index,
          hitsPerPage: 100,
        },
      ],
    });
    const { hits, page, nbPages } = results[0] as SearchResponse<GearType>;

    return {
      gears: await this.convertWithMyGears(
        hits.map(({ name, weight, company, objectID, imageUrl, color }) => ({
          name,
          weight,
          company,
          id: objectID,
          imageUrl,
          useless: [],
          used: [],
          bags: [],
          createDate: Date.now(),
          color,
        }))
      ),
      hasMore: page + 1 < nbPages,
    };
  }

  private async convertWithMyGears(data: Array<GearType>) {
    const myGears = await this.getList(GearFilter.All);

    return data.map(
      ({
        name,
        weight,
        company,
        id,
        imageUrl,
        category = '',
        subCategory = '',
        useless,
        used,
        bags,
        createDate,
        color,
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
          useless,
          used,
          bags,
          createDate,
          color
        );
      }
    );
  }

  private async getList(filter: GearFilter): Promise<Gear[]> {
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
          used,
          bags,
          createDate,
          color,
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
          createDate,
          color
        );
      });
    } else {
      return [];
    }
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
}

export default SearchStore;

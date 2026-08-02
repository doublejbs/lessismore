import { collection, getDocs, orderBy, query, where } from '@firebase/firestore';
import { SearchResponse } from 'algoliasearch';
import { liteClient } from 'algoliasearch/lite';
import Gear from '../model/Gear';
import GearFilter from '../warehouse/model/GearFilter';
import GearType from '../warehouse/type/GearType.ts';
import Firebase from './Firebase.ts';

class SearchStore {
  private readonly searchClient = liteClient('BWS6CWRXRM', 'dafcc0c015856d4ca5fb6d0626cf8f9f');

  public constructor(private readonly firebase: Firebase) {}

  public async searchList(
    value: string,
    index: number
  ): Promise<{ gears: Gear[]; hasMore: boolean }> {
    const keyword = value.trim();
    const { results } = await this.searchClient.search<GearType>({
      requests: [
        {
          indexName: 'useless-gear-search',
          query: keyword,
          page: index,
          hitsPerPage: 100,
        },
      ],
    });
    const { hits, page, nbPages } = results[0] as SearchResponse<GearType>;

    return {
      gears: await this.convertWithMyGears(
        hits.map(
          ({ name, weight, company, objectID, imageUrl, color, companyKorean, category }) => ({
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
            companyKorean,
            category,
          })
        )
      ),
      hasMore: (page ?? 0) + 1 < (nbPages ?? 0),
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
        useless,
        used,
        bags,
        createDate,
        color,
        companyKorean,
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
          useless,
          used,
          bags,
          createDate,
          color,
          companyKorean
        );
      }
    );
  }

  private async getList(filter: GearFilter): Promise<Gear[]> {
    if (!this.firebase.isLoggedIn()) {
      return [];
    } else {
      const filterQuery =
        filter === GearFilter.All
          ? collection(this.getStore(), 'users', this.getUserId(), 'gears')
          : query(
              collection(this.getStore(), 'users', this.getUserId(), 'gears'),
              where('category', '==', filter),
              orderBy('name', 'desc')
            );
      const gears = (await getDocs(filterQuery)).docs;

      if (gears?.length) {
        return gears.map((doc) => {
          const {
            id,
            name,
            company,
            weight,
            imageUrl,
            isCustom,
            category,
            useless,
            used,
            bags,
            createDate,
            color,
            companyKorean,
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
            useless,
            used,
            bags,
            createDate,
            color,
            companyKorean
          );
        });
      } else {
        return [];
      }
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

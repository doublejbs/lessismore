import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  limit as fsLimit,
  startAfter as fsStartAfter,
  where,
  addDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { liteClient } from 'algoliasearch/lite';
import app from '../../App';
import ManagerGear from '../model/ManagerGear';

class ManageStore {
  private readonly searchClient = liteClient('BWS6CWRXRM', 'dafcc0c015856d4ca5fb6d0626cf8f9f');

  public static new() {
    return new ManageStore(app.getFirebase());
  }

  private constructor(private readonly firebase: any) {}

  public async getList({
    limit = 100,
    startAfterDoc = null,
    sortField = 'createDate',
    sortOrder = 'desc',
    searchText = '',
  }: {
    limit?: number;
    startAfterDoc?: any;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    searchText?: string;
  } = {}): Promise<{
    items: ManagerGear[];
    lastDoc: any;
  }> {
    if (searchText) {
      console.log('searchText', searchText);
      // Algolia 검색
      const { results } = await this.searchClient.search<any>(
        {
          requests: [
            {
              indexName: 'useless-gear-search',
              query: searchText,
              page: 0,
              hitsPerPage: limit,
            },
          ],
        },
        {
          cacheable: false,
        }
      );

      const { hits } = results[0] as import('algoliasearch').SearchResponse<any>;
      let items = hits.map(
        (hit: any) =>
          new ManagerGear({
            id: hit.objectID,
            name: hit.name,
            company: hit.company,
            companyKorean: hit.companyKorean,
            weight: hit.weight,
            category: hit.category,
            subCategory: hit.subCategory,
            createDate: hit.createDate,
            imageUrl: hit.imageUrl,
            color: hit.color,
          })
      );
      // 프론트엔드에서 정렬 적용
      if (sortField) {
        items = items.sort((a, b) => {
          const aValue = (a as any)[sortField];
          const bValue = (b as any)[sortField];
          if (aValue === bValue) return 0;
          if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });
      }
      return { items, lastDoc: null };
    } else {
      // Firestore 쿼리
      const base = collection(this.firebase.getStore(), 'gear');
      let q;
      if (searchText) {
        q = query(
          base,
          orderBy('name'),
          where('name', '>=', searchText),
          where('name', '<=', searchText + '\uf8ff'),
          orderBy(sortField, sortOrder),
          fsLimit(limit)
        );
        if (startAfterDoc) {
          q = query(
            base,
            orderBy('name'),
            where('name', '>=', searchText),
            where('name', '<=', searchText + '\uf8ff'),
            orderBy(sortField, sortOrder),
            fsStartAfter(startAfterDoc),
            fsLimit(limit)
          );
        }
      } else {
        q = query(base, orderBy(sortField, sortOrder), fsLimit(limit));
        if (startAfterDoc) {
          q = query(
            base,
            orderBy(sortField, sortOrder),
            fsStartAfter(startAfterDoc),
            fsLimit(limit)
          );
        }
      }
      const snap = await getDocs(q);
      const items = snap.docs.map((doc) => {
        const data = doc.data() as any;
        return new ManagerGear({
          id: doc.id,
          name: data.name,
          company: data.company,
          companyKorean: data.companyKorean,
          weight: data.weight,
          category: data.category,
          subCategory: data.subCategory,
          createDate: data.createDate,
          imageUrl: data.imageUrl,
          color: data.color,
        });
      });
      const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
      return { items, lastDoc };
    }
  }

  public async updateName(id: string, newName: string): Promise<void> {
    const gearDoc = doc(this.firebase.getStore(), 'gear', id);
    await updateDoc(gearDoc, { name: newName });
  }

  public async updateCompany(id: string, newCompany: string): Promise<void> {
    const gearDoc = doc(this.firebase.getStore(), 'gear', id);
    await updateDoc(gearDoc, { company: newCompany });
  }

  public async updateWeight(id: string, newWeight: string): Promise<void> {
    const gearDoc = doc(this.firebase.getStore(), 'gear', id);
    await updateDoc(gearDoc, { weight: newWeight });
  }

  public async updateCategory(id: string, newCategory: string): Promise<void> {
    const gearDoc = doc(this.firebase.getStore(), 'gear', id);
    await updateDoc(gearDoc, { category: newCategory });
  }

  public async updateSubCategory(id: string, newSubCategory: string): Promise<void> {
    const gearDoc = doc(this.firebase.getStore(), 'gear', id);
    await updateDoc(gearDoc, { subCategory: newSubCategory });
  }

  public async updateGear(id: string, updateFields: Partial<ManagerGear>): Promise<void> {
    const gearDoc = doc(this.firebase.getStore(), 'gear', id);
    await updateDoc(gearDoc, {
      ...updateFields,
      weight: +(updateFields.weight || 0),
    });
  }

  public async addGear(fields: Partial<ManagerGear>): Promise<void> {
    const base = collection(this.firebase.getStore(), 'gear');
    await addDoc(base, {
      ...fields,
      weight: +(fields.weight || 0),
      isCustom: false,
      bags: [],
      used: [],
      useless: [],
      createDate: Date.now(),
    });
  }

  public async deleteGear(id: string): Promise<void> {
    const gearDoc = doc(this.firebase.getStore(), 'gear', id);
    await deleteDoc(gearDoc);
  }

  public async deleteGears(ids: string[]): Promise<void> {
    const store = this.firebase.getStore();
    const batch = writeBatch(store);
    ids.forEach(id => {
      const gearDoc = doc(store, 'gear', id);
      batch.delete(gearDoc);
    });
    await batch.commit();
  }
}

export default ManageStore;

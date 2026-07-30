import { deleteDoc, runTransaction, writeBatch } from '@firebase/firestore';
import dayjs, { Dayjs } from 'dayjs';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  CollectionReference,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  query,
  QueryDocumentSnapshot,
  QuerySnapshot,
  updateDoc,
  where,
} from 'firebase/firestore';
import BagItem from '../bag/model/BagItem';
import { getGroupForCategory } from '../gear/GearCategoryGroups';
import { isOwnGearImageUrl } from '../gear-image/GearImageOwnership';
import Gear from '../model/Gear';
import OrderType from '../order/OrderType.ts';
import GearFilter from '../warehouse/model/GearFilter';
import Firebase from './Firebase';
import GearStore, { GearData } from './GearStore.ts';

// Firestore `in` 절에 한 번에 넣을 수 있는 값의 개수 상한. 넘기면 쿼리가 예외로 실패한다.
const IN_CLAUSE_LIMIT = 30;

class BagStore {
  public constructor(
    private readonly firebase: Firebase,
    private readonly gearStore: GearStore
  ) {}

  public async getList(): Promise<BagItem[]> {
    try {
      const bagIDs = (
        await getDoc(doc(this.getStore(), 'users', this.firebase.getUserId()))
      ).data()?.['bags'];

      if (bagIDs.length) {
        const docs = await this.getDocsByIDs(
          collection(this.getStore(), 'bag'),
          bagIDs
        );

        return this.convertDocsToArray(
          BagStore.sortDocsByOrder(docs, 'startDate', true)
        );
      } else {
        return [];
      }
    } catch (e) {
      console.log(e);
      return [];
    }
  }

  public async getSharedBag(id: string, filters: GearFilter[], order: OrderType) {
    const bag = await getDoc(doc(this.getStore(), 'bag', id));
    if (bag.exists()) {
      const { name, weight, editDate, startDate, endDate, shared, gears, userId } = bag.data();

      if (!shared) {
        alert('공유되지 않은 배낭입니다.');
        throw new Error('Bag not shared');
      }

      if (gears.length === 0) {
        return {
          name,
          weight,
          editDate,
          startDate,
          endDate,
          gears: [],
          shared,
        };
      } else {
        const { field, descending } = BagStore.getOrderField(order);
        const warehouseDocs = BagStore.sortDocsByOrder(
          await this.getDocsByIDs(
            collection(this.getStore(), 'users', userId, 'gears'),
            gears
          ),
          field,
          descending
        );
        const warehouseGears = warehouseDocs
          .filter((doc) =>
            filters.length === 1 && filters[0] === GearFilter.All
              ? true
              : filters.some(
                  (filter) =>
                    getGroupForCategory((doc.data() as GearData).category) === filter
                )
          )
          .map((doc) => ({
            ...(doc.data() as GearData),
            id: doc.id,
          }));

        return {
          name,
          weight,
          editDate,
          startDate,
          endDate,
          shared,
          gears: warehouseGears.length
            ? warehouseGears.map(
                ({
                  id,
                  name,
                  company,
                  weight,
                  imageUrl,
                  category = '',
                  useless,
                  used,
                  bags,
                  isCustom,
                  createDate,
                  color,
                  companyKorean,
                }) =>
                  new Gear(
                    id,
                    name,
                    company,
                    weight,
                    // 배낭 주인이 **직접 올린 사진만** 넘긴다 — 크롤한 브랜드 이미지는
                    // 저작권상 노출하지 않는다(GearImageOwnership 주석 참고).
                    // 사용자 문서의 `imageUrl`에는 옛 등록 경로가 복사해 넣은 크롤 URL이
                    // 섞여 있어, 값의 존재만으로는 본인 사진인지 알 수 없다.
                    isOwnGearImageUrl(imageUrl, userId) ? imageUrl : '',
                    true,
                    isCustom,
                    category,
                    useless,
                    used,
                    bags,
                    createDate,
                    color,
                    companyKorean
                  )
              )
            : [],
        };
      }
    } else {
      return null;
    }
  }

  public async getBagWithAllFilter(id: string) {
    return await this.getBag(id, [GearFilter.All], OrderType.NameAsc);
  }

  public async getBag(id: string, filters: GearFilter[], order: OrderType) {
    const bagIDs = (
      await getDoc(doc(this.getStore(), 'users', this.firebase.getUserId()))
    ).data()?.['bags'];

    if (!bagIDs.includes(id)) {
      window.alert('잘못된 접근입니다.');
      throw new Error('Bag not found');
    }

    const { name, weight, gears, editDate, startDate, endDate, shared } = (
      await getDoc(doc(this.getStore(), 'bag', id))
    ).data() as {
      name: string;
      weight: string;
      editDate: string;
      startDate: string;
      endDate: string;
      gears: string[];
      shared: boolean;
    };

    if (gears.length === 0) {
      return {
        name,
        weight,
        editDate,
        startDate,
        endDate,
        gears: [],
        shared,
      };
    } else {
      const { field, descending } = BagStore.getOrderField(order);
      const warehouseDocs = BagStore.sortDocsByOrder(
        await this.getDocsByIDs(
          collection(this.getStore(), 'users', this.getUserID(), 'gears'),
          gears
        ),
        field,
        descending
      );
      const warehouseGears = warehouseDocs
        .filter((doc) =>
          filters.length === 1 && filters[0] === GearFilter.All
            ? true
            : filters.some((filter) => (doc.data() as GearData).category.includes(filter))
        )
        .map((doc) => ({
          ...(doc.data() as GearData),
          id: doc.id,
        }));

      return {
        name,
        weight,
        editDate,
        startDate,
        endDate,
        shared,
        gears: warehouseGears.length
          ? warehouseGears.map(
              ({
                id,
                name,
                company,
                weight,
                imageUrl,
                category = '',
                useless,
                used,
                bags,
                isCustom,
                createDate,
                color,
                companyKorean,
              }) =>
                new Gear(
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
                )
            )
          : [],
      };
    }
  }

  /**
   * 문서 ID 목록으로 문서를 가져온다.
   *
   * Firestore `in` 절은 값 **30개 제한**이 있어 31개부터는 쿼리 자체가 예외로 실패한다 —
   * 장비를 31개 이상 담은 배낭은 조회가 통째로 깨졌다. 30개씩 잘라 병렬 조회하고 합친다.
   *
   * **정렬은 청크 경계를 넘지 못하므로 여기서 하지 않는다.** 서버 `orderBy`를 붙여도
   * 청크별로만 정렬되니, 합친 결과를 호출부가 직접 정렬해야 한다.
   */
  private async getDocsByIDs(
    collectionRef: CollectionReference<DocumentData>,
    ids: string[]
  ): Promise<QueryDocumentSnapshot<DocumentData>[]> {
    const chunks: string[][] = [];

    for (let index = 0; index < ids.length; index += IN_CLAUSE_LIMIT) {
      chunks.push(ids.slice(index, index + IN_CLAUSE_LIMIT));
    }

    const snapshots = await Promise.all(
      chunks.map((chunk) =>
        getDocs(query(collectionRef, where('__name__', 'in', chunk)))
      )
    );

    return snapshots.flatMap((snapshot) => snapshot.docs);
  }

  /**
   * 합친 결과에 적용하는 정렬(위 `getDocsByIDs` 주석 참고).
   *
   * **저장된 값을 그대로 비교해 기존 노출 순서를 유지한다.** 무게가 문자열로 저장돼 있어
   * 사전순으로 비교되는 것(`1000g`이 `90g`보다 앞) 역시 서버 `orderBy`가 하던 그대로다 —
   * 여기서 숫자 비교로 바꾸면 이 수정과 무관한 순서 변경이 섞인다.
   */
  private static sortDocsByOrder(
    docs: QueryDocumentSnapshot<DocumentData>[],
    field: string,
    descending: boolean
  ) {
    return [...docs].sort((left, right) => {
      const leftValue = left.data()[field];
      const rightValue = right.data()[field];

      if (leftValue === rightValue) {
        return 0;
      }

      const ascending = leftValue < rightValue ? -1 : 1;

      return descending ? -ascending : ascending;
    });
  }

  /**
   * `OrderType`을 정렬 기준 필드로 옮긴다.
   *
   * 예전 `getOrderQuery`(서버 `orderBy` 절)를 대체한 것이다 — ID 목록 조회를 청크로 나눈
   * 뒤에는 서버 정렬을 쓸 수 없어(청크별로만 정렬됨) 같은 매핑을 클라이언트에서 재현한다.
   */
  private static getOrderField(order: OrderType): {
    field: string;
    descending: boolean;
  } {
    switch (order) {
      case OrderType.NameDesc:
        return { field: 'name', descending: true };
      case OrderType.WeightAsc:
        return { field: 'weight', descending: false };
      case OrderType.WeightDesc:
        return { field: 'weight', descending: true };
      case OrderType.CreatedAsc:
        return { field: 'createDate', descending: false };
      case OrderType.CreatedDesc:
        return { field: 'createDate', descending: true };
      case OrderType.NameAsc:
      default:
        return { field: 'name', descending: false };
    }
  }


  private convertToArray(data: QuerySnapshot<DocumentData, DocumentData>) {
    return this.convertDocsToArray(data.docs);
  }

  // 청크로 나눠 조회하면 스냅샷이 여러 개라 문서 배열을 직접 받는 입구가 필요하다.
  private convertDocsToArray(docs: QueryDocumentSnapshot<DocumentData>[]) {
    return docs.map((doc) => {
      const { name, weight, editDate, startDate, endDate } = doc.data();

      return new BagItem(
        doc.id,
        name,
        weight,
        dayjs(editDate),
        dayjs(startDate),
        dayjs(endDate)
      );
    });
  }

  public async add(name: string, startDate: Dayjs, endDate: Dayjs) {
    const docRef = await addDoc(collection(this.getStore(), 'bag'), {
      name,
      weight: 0,
      gears: [],
      editDate: new Date().toISOString(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      shared: false,
      userId: this.getUserID(),
    });

    await updateDoc(doc(this.getStore(), 'users', this.getUserID()), {
      bags: arrayUnion(docRef.id),
    });

    return docRef.id;
  }

  public async save(id: string, toAddGears: Gear[], toRemoveGears: Gear[], allGears: Gear[]) {
    const bagRef = doc(this.getStore(), 'bag', id);

    try {
      await runTransaction(this.getStore(), async (transaction) => {
        // 1. 모든 읽기 작업을 먼저 수행
        const bagSnap = await transaction.get(bagRef);
        if (!bagSnap.exists()) {
          throw new Error('Bag document does not exist!');
        }

        // toAddGears 문서 읽기
        const addGearSnapPromises = toAddGears.map((gear) => {
          const gearRef = doc(this.getStore(), 'users', this.getUserID(), 'gears', gear.getId());
          return transaction.get(gearRef);
        });
        const addGearSnaps = await Promise.all(addGearSnapPromises);

        // toRemoveGears 문서 읽기
        const removeGearSnapPromises = toRemoveGears.map((gear) => {
          const gearRef = doc(this.getStore(), 'users', this.getUserID(), 'gears', gear.getId());
          return transaction.get(gearRef);
        });
        const removeGearSnaps = await Promise.all(removeGearSnapPromises);

        // 2. 데이터 처리
        const gears = bagSnap.data()?.gears || [];
        const gearsSet = new Set(gears);
        toAddGears.forEach((gear) => gearsSet.add(gear.getId()));
        toRemoveGears.forEach((gear) => gearsSet.delete(gear.getId()));

        // 3. 모든 쓰기 작업 수행
        // Update bag document
        transaction.update(bagRef, {
          gears: Array.from(gearsSet),
          weight: allGears.reduce((acc, gear) => acc + parseInt(gear.getWeight() || '0'), 0),
        });

        // Update toAddGears documents
        addGearSnaps.forEach((gearSnap, index) => {
          if (gearSnap.exists()) {
            const gear = toAddGears[index];
            const gearRef = doc(this.getStore(), 'users', this.getUserID(), 'gears', gear.getId());
            transaction.update(gearRef, {
              bags: arrayUnion(id),
            });
          }
        });

        // Update toRemoveGears documents
        removeGearSnaps.forEach((gearSnap, index) => {
          if (gearSnap.exists()) {
            const gear = toRemoveGears[index];
            const gearRef = doc(this.getStore(), 'users', this.getUserID(), 'gears', gear.getId());
            transaction.update(gearRef, {
              bags: arrayRemove(id),
              used: arrayRemove(id),
              useless: arrayRemove(id),
            });
          }
        });
      });
    } catch (e) {
      console.error('Transaction failed:', e);
      throw e;
    }
  }

  public async delete(id: string) {
    try {
      const bagRef = doc(this.getStore(), 'bag', id);
      const bagSnap = await getDoc(bagRef);

      if (bagSnap.exists()) {
        const bagData = bagSnap.data();
        const gears: string[] = bagData.gears || [];

        if (gears.length > 0) {
          const batch = writeBatch(this.getStore());

          for (const gearId of gears) {
            const gearRef = doc(this.getStore(), 'users', this.getUserID(), 'gears', gearId);
            batch.update(gearRef, {
              bags: arrayRemove(id),
              useless: arrayRemove(id),
              used: arrayRemove(id),
            });
          }
          await batch.commit();
        }
      }
      await deleteDoc(bagRef);
      await updateDoc(doc(this.getStore(), 'users', this.getUserID()), {
        bags: arrayRemove(id),
      });
    } catch (e) {
      console.error('배낭 삭제 중 오류 발생:', e);
      throw e;
    }
  }

  private getStore() {
    return this.firebase.getStore();
  }

  private getUserID() {
    return this.firebase.getUserId();
  }

  public async getBags(bagIDs: string[]) {
    if (bagIDs.length) {
      // 여기는 원래 정렬을 걸지 않았으므로 합친 순서를 그대로 쓴다.
      return this.convertDocsToArray(
        await this.getDocsByIDs(collection(this.getStore(), 'bag'), bagIDs)
      );
    } else {
      return [];
    }
  }

  public async updateBagsWeight(bags: string[], weight: number) {
    const batch = writeBatch(this.getStore());
    bags.forEach((bag) => {
      const bagRef = doc(this.getStore(), 'bag', bag);
      batch.update(bagRef, { weight });
    });
    await batch.commit();
  }

  public async updateShared(id: string, userId: string, shared: boolean) {
    await updateDoc(doc(this.getStore(), 'bag', id), { shared, userId });
  }

  public async updateName(id: string, name: string) {
    await updateDoc(doc(this.getStore(), 'bag', id), { name });
  }

  public async updateDates(id: string, startDate: string, endDate: string) {
    await updateDoc(doc(this.getStore(), 'bag', id), {
      startDate,
      endDate,
    });
  }
}

export default BagStore;

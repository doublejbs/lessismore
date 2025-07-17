import Firebase from './Firebase';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  orderBy,
  query,
  QuerySnapshot,
  updateDoc,
  where,
} from 'firebase/firestore';
import GearStore, { GearData } from './GearStore.ts';
import dayjs, { Dayjs } from 'dayjs';
import Gear from '../model/Gear';
import BagItem from '../bag/model/BagItem';
import { runTransaction, writeBatch } from '@firebase/firestore';
import GearFilter from '../warehouse/model/GearFilter';
import OrderType from '../order/OrderType.ts';
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

      if (!!bagIDs.length) {
        const bags = await getDocs(
          query(
            collection(this.getStore(), 'bag'),
            where('__name__', 'in', bagIDs),
            orderBy('startDate', 'desc')
          )
        );

        return this.convertToArray(bags);
      } else {
        return [];
      }
    } catch (e) {
      console.log(e);
      return [];
    }
  }

  public async getBag(id: string, filters: GearFilter[], order: OrderType) {
    const bagIDs = (
      await getDoc(doc(this.getStore(), 'users', this.firebase.getUserId()))
    ).data()?.['bags'];

    const { name, weight, gears, editDate, startDate, endDate } = (
      await getDoc(doc(this.getStore(), 'bag', id))
    ).data() as {
      name: string;
      weight: string;
      editDate: string;
      startDate: string;
      endDate: string;
      gears: string[];
    };

    if (gears.length === 0) {
      return {
        name,
        weight,
        editDate,
        startDate,
        endDate,
        gears: [],
      };
    } else {
      const warehouseSnapshot = await getDocs(
        query(
          collection(this.getStore(), 'users', this.getUserID(), 'gears'),
          where('__name__', 'in', gears),
          this.getOrderQuery(order)
        )
      );
      const warehouseGears = warehouseSnapshot.docs
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

  private getOrderQuery(order: OrderType) {
    switch (order) {
      case OrderType.NameAsc:
        return orderBy('name', 'asc');
      case OrderType.NameDesc:
        return orderBy('name', 'desc');
      case OrderType.WeightAsc:
        return orderBy('weight', 'asc');
      case OrderType.WeightDesc:
        return orderBy('weight', 'desc');
      case OrderType.CreatedAsc:
        return orderBy('createDate', 'asc');
      case OrderType.CreatedDesc:
        return orderBy('createDate', 'desc');
      default:
        return orderBy('name', 'asc');
    }
  }

  private convertToArray(data: QuerySnapshot<DocumentData, DocumentData>) {
    const result: BagItem[] = [];
    data.forEach((doc) => {
      const { name, weight, editDate, startDate, endDate } = doc.data();

      result.push(
        new BagItem(doc.id, name, weight, dayjs(editDate), dayjs(startDate), dayjs(endDate))
      );
    });
    return result;
  }

  public async add(name: string, startDate: Dayjs, endDate: Dayjs) {
    const docRef = await addDoc(collection(this.getStore(), 'bag'), {
      name,
      weight: 0,
      gears: [],
      editDate: new Date().toISOString(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
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
    await updateDoc(doc(this.getStore(), 'users', this.getUserID()), {
      bags: arrayRemove(id),
    });
  }

  private getStore() {
    return this.firebase.getStore();
  }

  private getUserID() {
    return this.firebase.getUserId();
  }

  public async getBags(bagIDs: string[]) {
    if (bagIDs.length) {
      return this.convertToArray(
        await getDocs(query(collection(this.getStore(), 'bag'), where('__name__', 'in', bagIDs)))
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
}

export default BagStore;

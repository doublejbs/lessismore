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
import dayjs from 'dayjs';
import Gear from '../model/Gear';
import BagItem from '../bag/model/BagItem';
import { deleteField } from '@firebase/firestore';

class BagStore {
  public constructor(
    private readonly firebase: Firebase,
    private readonly gearStore: GearStore
  ) {}

  public async getList(): Promise<BagItem[]> {
    const bagIDs = (
      await getDoc(doc(this.getStore(), 'users', this.firebase.getUserId()))
    ).data()?.['bags'];

    if (!!bagIDs.length) {
      const bags = await getDocs(
        query(
          collection(this.getStore(), 'bag'),
          where('__name__', 'in', bagIDs),
          orderBy('editDate', 'desc')
        )
      );

      return this.convertToArray(bags);
    } else {
      return [];
    }
  }

  public async getBag(id: string) {
    const { name, weight, gearMap } = (
      await getDoc(doc(this.getStore(), 'bag', id))
    ).data() as {
      name: string;
      weight: string;
      gearMap: { [key: string]: { id: string; weight: string } };
    };

    const gearData = await this.getGearsWithIDs(
      Object.entries(gearMap).map(([, { id }]) => id)
    );

    return {
      name,
      weight,
      gears: gearData.length
        ? gearData.map(
            ({
              id,
              name,
              company,
              weight,
              imageUrl,
              category = '',
              subCategory = '',
            }) =>
              new Gear(
                id,
                name,
                company,
                weight,
                imageUrl,
                true,
                false,
                category,
                subCategory
              )
          )
        : [],
    };
  }

  private async getGearsWithIDs(gearIDs: string[]) {
    /*
    todo: 현재는 gear 컬렉션에서 데이터를 가져온다.

    창고에서 추가한 아이템은 사용자의 창고 컬렉션에서 가져와야한다.
    검색에서 추가한 아이템은 전체 gear 컬렉션에서 가져와야한다.


    오히려 bag gears에는 데이터 복사에서 저장해놓고,
    gear 수정시에 bag를 조회해가며 데이터 업데이트를 하는게 나을수도...
    단 조회 성능을 높이기 위해 bag > gearIds로 저장해두는게 좋겠다.
    혹은 gear > bagIds로 저장해두는게 좋겠다.
     */

    if (!gearIDs.length) {
      return [];
    }

    if (gearIDs.length > 10) {
      const gearPromises = gearIDs.map((gearId: string) =>
        getDoc(doc(this.getStore(), 'gear', gearId))
      );
      const result = await Promise.all(gearPromises);
      const gearData: GearData[] = result
        .filter((gear) => gear.exists())
        .map((docData) => {
          return { ...docData.data(), id: docData.id } as GearData;
        });

      return gearData;
    } else {
      return (
        await getDocs(
          query(
            collection(this.getStore(), 'gear'),
            where('__name__', 'in', gearIDs)
          )
        )
      ).docs
        .filter((gear) => gear.exists())
        .map((doc) => {
          return { ...doc.data(), id: doc.id } as GearData;
        });
    }
  }

  private convertToArray(data: QuerySnapshot<DocumentData, DocumentData>) {
    const result: BagItem[] = [];
    data.forEach((doc) => {
      const { name, weight, editDate } = doc.data();

      result.push(new BagItem(doc.id, name, weight, dayjs(editDate)));
    });
    return result;
  }

  public async add(value: string) {
    const docRef = await addDoc(collection(this.getStore(), 'bag'), {
      name: value,
      weight: '0',
      gears: [],
      editDate: new Date().toISOString(),
    });
    await updateDoc(doc(this.getStore(), 'users', this.getUserID()), {
      bags: arrayUnion(docRef.id),
    });
  }

  public async addGear(id: string, gear: Gear) {
    await updateDoc(doc(this.getStore(), 'bag', id), {
      [`gearMap.${gear.getId()}`]: {
        id: gear.getId(),
        weight: gear.getWeight(),
      },
    });
    await this.updateWeight(id);
  }

  public async removeGear(id: string, gear: Gear) {
    await updateDoc(doc(this.getStore(), 'bag', id), {
      [`gearMap.${gear.getId()}`]: deleteField(),
    });
    await this.updateWeight(id);
  }

  private async updateWeight(id: string) {
    const { gears } = await this.getBag(id);
    const weight = gears.reduce((acc, gear: Gear) => {
      return acc + (parseInt(gear.getWeight()) || 0);
    }, 0);

    await updateDoc(doc(this.getStore(), 'bag', id), {
      weight,
    });
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
}

export default BagStore;

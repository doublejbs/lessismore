import { makeAutoObservable } from 'mobx';
import { doc, getDoc } from 'firebase/firestore';
import app from '../../App';

// 장비 공유 랜딩(GD-7)에서 표시할 장비 정보. Firestore `/gear/{id}`(카탈로그, 공개 읽기)를 읽는다.
export interface GearData {
  name?: string;
  nameKorean?: string;
  company?: string;
  companyKorean?: string;
  weight?: string | number;
  imageUrl?: string;
  category?: string;
  color?: string;
  colorKorean?: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  tent: '텐트',
  sleepingBag: '침낭',
  backpack: '배낭',
  clothing: '의류',
  mat: '매트',
  furniture: '가구',
  lantern: '랜턴',
  cooking: '조리',
  electronic: '전자기기',
  food: '음식',
  etc: '기타',
};

class GearShare {
  public static from(id: string) {
    return new GearShare(id);
  }

  private gear: GearData | null = null;
  private initialized = false;
  private notFound = false;

  private constructor(private readonly id: string) {
    makeAutoObservable(this);
  }

  public async initialize() {
    try {
      const snapshot = await getDoc(
        doc(app.getFirebase().getStore(), 'gear', this.id)
      );

      if (!snapshot.exists()) {
        this.setNotFound(true);
      } else {
        this.setGear(snapshot.data() as GearData);
      }
    } catch (e) {
      console.error('장비 조회 실패:', e);
      this.setNotFound(true);
    } finally {
      this.setInitialized(true);
    }
  }

  private setGear(value: GearData) {
    this.gear = value;
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  private setNotFound(value: boolean) {
    this.notFound = value;
  }

  public isInitialized() {
    return this.initialized;
  }

  public isNotFound() {
    return this.notFound;
  }

  public getId() {
    return this.id;
  }

  public getName() {
    return this.gear?.nameKorean || this.gear?.name || '';
  }

  public getCompany() {
    return this.gear?.companyKorean || this.gear?.company || '';
  }

  public getWeightLabel() {
    const w = this.gear?.weight;

    return w != null && String(w).length > 0 ? `${w}g` : '';
  }

  public getImageUrl() {
    return this.gear?.imageUrl ?? '';
  }

  // 카테고리 · 색상 메타 라인(앱 상세와 동일 톤). 둘 다 없으면 빈 문자열.
  public getMetaLine() {
    const category = this.gear?.category
      ? CATEGORY_LABEL[this.gear.category] ?? ''
      : '';
    const color = this.gear?.colorKorean || this.gear?.color || '';

    return [category, color].filter(Boolean).join(' · ');
  }
}

export default GearShare;

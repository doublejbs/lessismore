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
  category?: string;
  color?: string;
  colorKorean?: string;
  size?: string;
  sizeKorean?: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  tent: '텐트',
  tarp: '타프',
  shelter: '쉘터',
  tent_acc: '텐트ACC',
  sleeping_bag: '침낭',
  sleepingBag: '침낭',
  backpack: '배낭',
  vest_pack: '베스트 배낭',
  backpack_cover: '배낭 커버',
  pouch: '파우치·수납가방',
  clothing: '의류',
  gloves: '장갑',
  gaiter: '스패츠',
  sunglasses: '선글라스',
  mat: '매트',
  pillow: '필로우',
  furniture: '가구',
  chair: '체어',
  table: '테이블',
  furniture_etc: '그 외 기타',
  lantern: '랜턴',
  lighting: '조명',
  headlamp: '헤드랜턴',
  cooking: '조리',
  cookware: '코펠·쿡웨어',
  stove: '버너',
  torch: '토치',
  cup: '컵',
  bowl: '그릇',
  cutlery: '수저',
  bottle: '물통',
  cookware_etc: '식기류 기타',
  electronic: '전자기기',
  food: '음식',
  etc: '기타',
  towel: '수건',
  hand_warmer: '핫팩',
  shovel: '삽',
  hammer: '망치',
  microspikes: '아이젠',
  trekking_pole: '트레킹폴',
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

  // 카테고리 · 색상 · 사이즈 메타 라인(앱 상세와 동일 톤). 빈 항목은 생략한다.
  public getMetaLine() {
    const category = this.gear?.category
      ? CATEGORY_LABEL[this.gear.category] ?? ''
      : '';
    const color = this.gear?.colorKorean || this.gear?.color || '';
    const size = this.gear?.sizeKorean || this.gear?.size || '';

    return [category, color, size].filter(Boolean).join(' · ');
  }
}

export default GearShare;

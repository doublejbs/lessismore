import { makeAutoObservable } from 'mobx';
import { doc, getDoc } from 'firebase/firestore';
import app from '../../App';

// 박지 공유 랜딩(CS-7)에서 표시할 박지 정보. Firestore `/camp-spot/{id}`(공개 읽기)를 읽는다.
export interface CampSpotData {
  name: string;
  type: string; // campground | shelter | wild
  region: string;
  description?: string;
  warnings?: string;
  imageUrl?: string;
  tags?: string[];
}

const TYPE_LABEL: Record<string, string> = {
  campground: '야영장',
  shelter: '대피소',
  wild: '노지',
};

const TAG_LABEL: Record<string, string> = {
  mountain: '산',
  beach: '해변',
  valley: '계곡',
  island: '섬',
  lake: '호수',
  plain: '초원',
  forest: '숲',
};

class CampShare {
  public static from(id: string) {
    return new CampShare(id);
  }

  private spot: CampSpotData | null = null;
  private initialized = false;
  private notFound = false;

  private constructor(private readonly id: string) {
    makeAutoObservable(this);
  }

  public async initialize() {
    try {
      const snapshot = await getDoc(
        doc(app.getFirebase().getStore(), 'camp-spot', this.id)
      );

      if (!snapshot.exists()) {
        this.setNotFound(true);
      } else {
        this.setSpot(snapshot.data() as CampSpotData);
      }
    } catch (e) {
      console.error('박지 조회 실패:', e);
      this.setNotFound(true);
    } finally {
      this.setInitialized(true);
    }
  }

  private setSpot(value: CampSpotData) {
    this.spot = value;
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
    return this.spot?.name ?? '';
  }

  public getTypeLabel() {
    return this.spot ? TYPE_LABEL[this.spot.type] ?? '' : '';
  }

  public getRegion() {
    return this.spot?.region ?? '';
  }

  public getDescription() {
    return this.spot?.description ?? '';
  }

  public getWarnings() {
    return this.spot?.warnings ?? '';
  }

  public getImageUrl() {
    return this.spot?.imageUrl ?? '';
  }

  public getTagLabels(): string[] {
    return (this.spot?.tags ?? [])
      .map(tag => TAG_LABEL[tag])
      .filter((label): label is string => Boolean(label));
  }
}

export default CampShare;

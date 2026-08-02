import { makeAutoObservable } from 'mobx';
import Gear from '../model/Gear';

type StateListener<T = any> = (newState: T, oldState: T) => void;

interface AppState {
  gears: Gear[];
  selectedGear: Gear | null;
  loading: boolean;
  error: string | null;
  filters: {
    category: string;
    search: string;
  };
}

class StateStore {
  private static instance: StateStore;
  private state: AppState;
  private listeners: Map<string, StateListener[]> = new Map();

  public static getInstance(): StateStore {
    if (!StateStore.instance) {
      StateStore.instance = new StateStore();
    }
    return StateStore.instance;
  }

  private constructor() {
    this.state = {
      gears: [],
      selectedGear: null,
      loading: false,
      error: null,
      filters: {
        category: '',
        search: '',
      },
    };

    makeAutoObservable(this);
  }

  // 상태 조회
  public getState(): AppState {
    return this.state;
  }

  public getGears(): Gear[] {
    return this.state.gears;
  }

  public getSelectedGear(): Gear | null {
    return this.state.selectedGear;
  }

  public isLoading(): boolean {
    return this.state.loading;
  }

  public getError(): string | null {
    return this.state.error;
  }

  public getFilters() {
    return this.state.filters;
  }

  // 상태 업데이트
  public setGears(gears: Gear[]): void {
    const oldState = { ...this.state };
    this.state.gears = gears;
    this.notifyListeners('gears', this.state, oldState);
  }

  public addGear(gear: Gear): void {
    const oldState = { ...this.state };
    this.state.gears.push(gear);
    this.notifyListeners('gears', this.state, oldState);
  }

  public updateGear(updatedGear: Gear): void {
    const oldState = { ...this.state };
    const index = this.state.gears.findIndex((gear) => gear.getId() === updatedGear.getId());
    if (index !== -1) {
      this.state.gears[index] = updatedGear;
      if (this.state.selectedGear?.getId() === updatedGear.getId()) {
        this.state.selectedGear = updatedGear;
      }
      this.notifyListeners('gears', this.state, oldState);
    }
  }

  public removeGear(gearId: string): void {
    const oldState = { ...this.state };
    this.state.gears = this.state.gears.filter((gear) => gear.getId() !== gearId);
    if (this.state.selectedGear?.getId() === gearId) {
      this.state.selectedGear = null;
    }
    this.notifyListeners('gears', this.state, oldState);
  }

  public setSelectedGear(gear: Gear | null): void {
    const oldState = { ...this.state };
    this.state.selectedGear = gear;
    this.notifyListeners('selectedGear', this.state, oldState);
  }

  public setLoading(loading: boolean): void {
    const oldState = { ...this.state };
    this.state.loading = loading;
    this.notifyListeners('loading', this.state, oldState);
  }

  public setError(error: string | null): void {
    const oldState = { ...this.state };
    this.state.error = error;
    this.notifyListeners('error', this.state, oldState);
  }

  public setFilters(filters: Partial<AppState['filters']>): void {
    const oldState = { ...this.state };
    this.state.filters = { ...this.state.filters, ...filters };
    this.notifyListeners('filters', this.state, oldState);
  }

  // 리스너 관리
  public subscribe(key: string, listener: StateListener): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }

    this.listeners.get(key)!.push(listener);

    // 구독 해제 함수 반환
    return () => this.unsubscribe(key, listener);
  }

  public unsubscribe(key: string, listener: StateListener): void {
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      const index = keyListeners.indexOf(listener);
      if (index > -1) {
        keyListeners.splice(index, 1);
      }
    }
  }

  private notifyListeners(key: string, newState: AppState, oldState: AppState): void {
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach((listener) => listener(newState, oldState));
    }
  }

  // 액션 메서드들 (비즈니스 로직 포함)
  public async loadGears(): Promise<void> {
    this.setLoading(true);
    this.setError(null);

    try {
      // 실제 데이터 로딩 로직은 여기에 구현
      // const gears = await gearService.getGears();
      // this.setGears(gears);
    } catch (error) {
      this.setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      this.setLoading(false);
    }
  }

  public async saveGear(gear: Gear): Promise<void> {
    this.setLoading(true);
    this.setError(null);

    try {
      // 실제 저장 로직은 여기에 구현
      // await gearService.saveGear(gear);

      const existingIndex = this.state.gears.findIndex((g) => g.getId() === gear.getId());
      if (existingIndex !== -1) {
        this.updateGear(gear);
      } else {
        this.addGear(gear);
      }
    } catch (error) {
      this.setError(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.');
    } finally {
      this.setLoading(false);
    }
  }

  public async deleteGear(gearId: string): Promise<void> {
    this.setLoading(true);
    this.setError(null);

    try {
      // 실제 삭제 로직은 여기에 구현
      // await gearService.deleteGear(gearId);
      this.removeGear(gearId);
    } catch (error) {
      this.setError(error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.');
    } finally {
      this.setLoading(false);
    }
  }
}

export type { AppState, StateListener };
export default StateStore;

class LocalStorageManager {
  // 값 저장 (문자열/객체 모두 지원)
  static set<T = any>(key: string, value: T) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('localStorage 저장 실패:', e);
    }
  }

  // 값 불러오기 (제네릭 타입 지원)
  static get<T = any>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      return JSON.parse(item) as T;
    } catch (e) {
      console.error('localStorage 불러오기 실패:', e);
      return null;
    }
  }

  // 값 삭제
  static remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('localStorage 삭제 실패:', e);
    }
  }

  // 전체 비우기 (주의!)
  static clear() {
    try {
      localStorage.clear();
    } catch (e) {
      console.error('localStorage 전체 삭제 실패:', e);
    }
  }
}

export default LocalStorageManager; 
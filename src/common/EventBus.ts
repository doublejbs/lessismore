type EventCallback<T = any> = (data: T) => void;

class EventBus {
  private static instance: EventBus;
  private events: Map<string, EventCallback[]> = new Map();

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  private constructor() {}

  // 이벤트 구독
  public on<T = any>(eventName: string, callback: EventCallback<T>): () => void {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }

    this.events.get(eventName)!.push(callback);

    // 구독 해제 함수 반환
    return () => this.off(eventName, callback);
  }

  // 이벤트 발행
  public emit<T = any>(eventName: string, data?: T): void {
    const callbacks = this.events.get(eventName);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  // 이벤트 구독 해제
  public off<T = any>(eventName: string, callback: EventCallback<T>): void {
    const callbacks = this.events.get(eventName);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // 모든 이벤트 리스너 제거
  public clear(): void {
    this.events.clear();
  }

  // 특정 이벤트의 모든 리스너 제거
  public clearEvent(eventName: string): void {
    this.events.delete(eventName);
  }
}

export default EventBus;

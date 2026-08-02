interface Component {
  setMediator(mediator: Mediator): void;
  getName(): string;
}

interface Mediator {
  notify(sender: Component, event: string, data?: any): void;
}

class ConcreteMediator implements Mediator {
  private components: Map<string, Component> = new Map();

  public addComponent(component: Component): void {
    component.setMediator(this);
    this.components.set(component.getName(), component);
  }

  public removeComponent(componentName: string): void {
    this.components.delete(componentName);
  }

  public notify(sender: Component, event: string, data?: any): void {
    // 이벤트에 따른 로직 처리
    switch (event) {
      case 'gear_updated':
        this.handleGearUpdated(sender, data);
        break;
      case 'gear_deleted':
        this.handleGearDeleted(sender, data);
        break;
      case 'bag_updated':
        this.handleBagUpdated(sender, data);
        break;
      default:
        console.log(`Unknown event: ${event} from ${sender.getName()}`);
    }
  }

  private handleGearUpdated(sender: Component, data: any): void {
    // 장비 업데이트 시 관련 컴포넌트들에게 알림
    this.components.forEach((component, name) => {
      if (name !== sender.getName() && name.includes('warehouse')) {
        // 창고 관련 컴포넌트들에게 알림
        (component as any).onGearUpdated?.(data);
      }
    });
  }

  private handleGearDeleted(sender: Component, data: any): void {
    // 장비 삭제 시 관련 컴포넌트들에게 알림
    this.components.forEach((component, name) => {
      if (name !== sender.getName()) {
        (component as any).onGearDeleted?.(data);
      }
    });
  }

  private handleBagUpdated(sender: Component, data: any): void {
    // 가방 업데이트 시 관련 컴포넌트들에게 알림
    this.components.forEach((component, name) => {
      if (name !== sender.getName() && name.includes('bag')) {
        (component as any).onBagUpdated?.(data);
      }
    });
  }
}

// 기본 컴포넌트 클래스
abstract class BaseComponent implements Component {
  protected mediator?: Mediator;

  public setMediator(mediator: Mediator): void {
    this.mediator = mediator;
  }

  public abstract getName(): string;

  protected notifyMediator(event: string, data?: any): void {
    if (this.mediator) {
      this.mediator.notify(this, event, data);
    }
  }
}

export type { Component, Mediator };
export { ConcreteMediator, BaseComponent };

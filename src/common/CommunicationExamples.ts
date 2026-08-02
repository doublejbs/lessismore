import EventBus from './EventBus';
import { ConcreteMediator, BaseComponent } from './Mediator';
import { CommandInvoker, UpdateGearCommand } from './CommandPattern';
import StateStore from './StateStore';
import Gear from '../model/Gear';

// 1. EventBus 사용 예시
class WarehouseModel {
  private eventBus = EventBus.getInstance();
  private unsubscribers: (() => void)[] = [];

  constructor() {
    // 이벤트 구독
    const unsubscribe1 = this.eventBus.on('gear_updated', this.handleGearUpdated.bind(this));
    const unsubscribe2 = this.eventBus.on('gear_deleted', this.handleGearDeleted.bind(this));

    this.unsubscribers.push(unsubscribe1, unsubscribe2);
  }

  public updateGear(gear: Gear): void {
    // 장비 업데이트 로직
    console.log('Updating gear:', gear.getName());

    // 다른 모델들에게 알림
    this.eventBus.emit('gear_updated', gear);
  }

  private handleGearUpdated(gear: Gear): void {
    console.log('Warehouse received gear update:', gear.getName());
    // 창고 목록 새로고침 등의 로직
  }

  private handleGearDeleted(gear: Gear): void {
    console.log('Warehouse received gear deletion:', gear.getName());
    // 창고에서 해당 장비 제거 로직
  }

  public dispose(): void {
    // 구독 해제
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
  }
}

// 2. Mediator 패턴 사용 예시
class WarehouseComponent extends BaseComponent {
  public getName(): string {
    return 'warehouse';
  }

  public updateGear(gear: Gear): void {
    console.log('Warehouse updating gear:', gear.getName());
    // 중재자에게 알림
    this.notifyMediator('gear_updated', gear);
  }

  public onGearUpdated(gear: Gear): void {
    console.log('Warehouse received gear update notification:', gear.getName());
    // 창고 목록 업데이트 로직
  }
}

class BagComponent extends BaseComponent {
  public getName(): string {
    return 'bag';
  }

  public onGearUpdated(gear: Gear): void {
    console.log('Bag received gear update notification:', gear.getName());
    // 가방 내 장비 정보 업데이트 로직
  }
}

// 3. Command 패턴 사용 예시
class GearService {
  private commandInvoker = new CommandInvoker();

  public async updateGear(gear: Gear, newData: any, oldData: any): Promise<void> {
    const command = new UpdateGearCommand(gear, newData, oldData, this.performUpdate.bind(this));

    await this.commandInvoker.execute(command);
  }

  private async performUpdate(gear: Gear, data: any): Promise<void> {
    console.log('Performing gear update:', gear.getName(), data);
    // 실제 업데이트 로직
  }

  public async undo(): Promise<void> {
    await this.commandInvoker.undo();
  }

  public async redo(): Promise<void> {
    await this.commandInvoker.redo();
  }
}

// 4. StateStore 사용 예시
class GearManager {
  private stateStore = StateStore.getInstance();
  private unsubscribers: (() => void)[] = [];

  constructor() {
    // 상태 변경 구독
    const unsubscribe1 = this.stateStore.subscribe('gears', this.handleGearsChanged.bind(this));
    const unsubscribe2 = this.stateStore.subscribe(
      'selectedGear',
      this.handleSelectedGearChanged.bind(this)
    );

    this.unsubscribers.push(unsubscribe1, unsubscribe2);
  }

  public async addGear(gear: Gear): Promise<void> {
    await this.stateStore.saveGear(gear);
  }

  public selectGear(gear: Gear): void {
    this.stateStore.setSelectedGear(gear);
  }

  public searchGears(searchTerm: string): void {
    this.stateStore.setFilters({ search: searchTerm });
  }

  private handleGearsChanged(newState: any, oldState: any): void {
    console.log('Gears changed:', newState.gears.length, 'items');
    // UI 업데이트 로직
  }

  private handleSelectedGearChanged(newState: any, oldState: any): void {
    console.log('Selected gear changed:', newState.selectedGear?.getName());
    // 선택된 장비 UI 업데이트 로직
  }

  public dispose(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
  }
}

// 사용법 데모
export function demonstratePatterns(): void {
  console.log('=== 모델 간 통신 패턴 데모 ===');

  // 1. EventBus 데모
  console.log('\n1. EventBus 패턴:');
  const warehouse = new WarehouseModel();
  // warehouse.updateGear(someGear); // 이벤트 발생

  // 2. Mediator 데모
  console.log('\n2. Mediator 패턴:');
  const mediator = new ConcreteMediator();
  const warehouseComp = new WarehouseComponent();
  const bagComp = new BagComponent();

  mediator.addComponent(warehouseComp);
  mediator.addComponent(bagComp);

  // warehouseComp.updateGear(someGear); // 중재자를 통한 통신

  // 3. Command 데모
  console.log('\n3. Command 패턴:');
  const gearService = new GearService();
  // await gearService.updateGear(gear, newData, oldData);
  // await gearService.undo(); // 실행 취소

  // 4. StateStore 데모
  console.log('\n4. StateStore 패턴:');
  const gearManager = new GearManager();
  // await gearManager.addGear(someGear);
  // gearManager.selectGear(someGear);
}

export { WarehouseModel, WarehouseComponent, BagComponent, GearService, GearManager };

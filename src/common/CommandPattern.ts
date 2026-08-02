import Gear from '../model/Gear';

// 명령 인터페이스
interface Command {
  execute(): Promise<void> | void;
  undo?(): Promise<void> | void;
}

// 명령 실행기
class CommandInvoker {
  private history: Command[] = [];
  private currentIndex = -1;

  public async execute(command: Command): Promise<void> {
    // 현재 위치 이후의 명령들 제거 (새로운 명령 실행 시)
    this.history = this.history.slice(0, this.currentIndex + 1);

    await command.execute();
    this.history.push(command);
    this.currentIndex++;
  }

  public async undo(): Promise<void> {
    if (this.currentIndex >= 0) {
      const command = this.history[this.currentIndex];
      if (command.undo) {
        await command.undo();
      }
      this.currentIndex--;
    }
  }

  public async redo(): Promise<void> {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      const command = this.history[this.currentIndex];
      await command.execute();
    }
  }

  public canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  public canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  public clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }
}

// 구체적인 명령들
class UpdateGearCommand implements Command {
  constructor(
    private gear: Gear,
    private newData: Partial<any>,
    private oldData: Partial<any>,
    private updateCallback: (gear: Gear, data: any) => Promise<void>
  ) {}

  public async execute(): Promise<void> {
    await this.updateCallback(this.gear, this.newData);
  }

  public async undo(): Promise<void> {
    await this.updateCallback(this.gear, this.oldData);
  }
}

class DeleteGearCommand implements Command {
  constructor(
    private gear: Gear,
    private deleteCallback: (gear: Gear) => Promise<void>,
    private restoreCallback: (gear: Gear) => Promise<void>
  ) {}

  public async execute(): Promise<void> {
    await this.deleteCallback(this.gear);
  }

  public async undo(): Promise<void> {
    await this.restoreCallback(this.gear);
  }
}

class AddGearCommand implements Command {
  constructor(
    private gear: Gear,
    private addCallback: (gear: Gear) => Promise<void>,
    private removeCallback: (gear: Gear) => Promise<void>
  ) {}

  public async execute(): Promise<void> {
    await this.addCallback(this.gear);
  }

  public async undo(): Promise<void> {
    await this.removeCallback(this.gear);
  }
}

// 매크로 명령 (여러 명령을 하나로 묶음)
class MacroCommand implements Command {
  constructor(private commands: Command[]) {}

  public async execute(): Promise<void> {
    for (const command of this.commands) {
      await command.execute();
    }
  }

  public async undo(): Promise<void> {
    // 역순으로 undo 실행
    for (let i = this.commands.length - 1; i >= 0; i--) {
      const command = this.commands[i];
      if (command.undo) {
        await command.undo();
      }
    }
  }
}

export type { Command };
export { CommandInvoker, UpdateGearCommand, DeleteGearCommand, AddGearCommand, MacroCommand };

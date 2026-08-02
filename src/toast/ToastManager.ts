import { makeAutoObservable } from 'mobx';

class ToastManager {
  public static new() {
    return new ToastManager();
  }

  private visible = false;
  private message = '';

  private constructor() {
    makeAutoObservable(this);
  }

  public show({ message }: { message: string }) {
    this.setMessage(message);
    this.setVisible(true);
    setTimeout(() => {
      this.hide();
    }, 2000);
  }

  public hide() {
    this.setVisible(false);
  }

  private setVisible(visible: boolean) {
    this.visible = visible;
  }

  public isVisible() {
    return this.visible;
  }

  private setMessage(text: string) {
    this.message = text;
  }

  public getMessage() {
    return this.message;
  }
}

export default ToastManager;

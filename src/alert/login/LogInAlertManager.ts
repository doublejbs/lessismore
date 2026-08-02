import { makeAutoObservable } from 'mobx';
import Firebase from '../../firebase/Firebase';
import app from '../../App';

class LogInAlertManager {
  public static new() {
    return new LogInAlertManager(app.getFirebase());
  }

  private visible = false;
  private loading = false;

  private constructor(private readonly firebase: Firebase) {
    makeAutoObservable(this);
  }

  public show() {
    this.setVisible(true);
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

  public async confirm() {
    this.setLoading(true);
    await this.firebase.logInWithGoogle();
    this.setLoading(false);
    this.hide();
  }

  private setLoading(loading: boolean) {
    this.loading = loading;
  }

  public isLoading() {
    return this.loading;
  }
}

export default LogInAlertManager;

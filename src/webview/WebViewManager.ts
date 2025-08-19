import Firebase from '../firebase/Firebase';
import { makeAutoObservable } from 'mobx';

declare global {
  interface Window {
    NativeBridge: {
      closeWebView(): void;
      updateData(): void;
      navigate(path: string): void;
      navigateToLogin(): void;
    };
  }
}

class WebViewManager {
  public static new(firebase: Firebase) {
    return new WebViewManager(firebase);
  }

  private initialized = false;

  private constructor(private readonly firebase: Firebase) {
    makeAutoObservable(this);
  }

  public async initialize() {
    // WebView 환경에서만 실행
    if (!this.isWebView() || this.isInitialized()) {
      this.setInitialized(true);
      return;
    }

    // 1. URL 쿼리 파라미터에서 토큰 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromQuery = urlParams.get('token');
    const accessTokenFromQuery = urlParams.get('accessToken');

    if (tokenFromQuery && accessTokenFromQuery) {
      try {
        await this.firebase.signInWithIdToken(tokenFromQuery, accessTokenFromQuery);
        // 토큰 사용 후 URL에서 제거 (보안상 좋음)
        this.removeTokenFromUrl();
        this.setInitialized(true);
      } catch (e) {
        window.alert(`로그인 실패 ${e}`);
        console.error('webview error', e);
      }
    } else {
      this.setInitialized(true);
    }
  }

  public isWebView(): boolean {
    return !!(window as unknown as { NativeBridge: boolean }).NativeBridge;
  }

  private removeTokenFromUrl(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    window.history.replaceState({}, document.title, url.toString());
  }

  private setInitialized(initialized: boolean) {
    this.initialized = initialized;
  }

  public isInitialized() {
    return this.initialized;
  }

  public closeWebView() {
    if (this.isWebView()) {
      console.log('closeWebView');
      window.NativeBridge.closeWebView();
    }
  }

  public updateData() {
    if (this.isWebView()) {
      window.NativeBridge.updateData();
    }
  }

  public navigate(path: string) {
    if (this.isWebView()) {
      window.NativeBridge.navigate(path);
    }
  }

  public navigateToLogin() {
    window.NativeBridge.navigateToLogin();
  }
}

export default WebViewManager;

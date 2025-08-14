import Firebase from '../firebase/Firebase';

class WebViewManager {
  public static new(firebase: Firebase) {
    return new WebViewManager(firebase);
  }

  private constructor(private readonly firebase: Firebase) {}

  public async initialize() {
    // WebView 환경에서만 실행
    if (!this.isWebView()) {
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
      } catch (e) {
        console.error('webview error', e);
      }
    }
  }

  private isWebView(): boolean {
    // 1. User Agent로 WebView 감지
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroidWebView =
      userAgent.includes('wv') || (userAgent.includes('android') && userAgent.includes('version'));
    const isIOSWebView = userAgent.includes('mobile') && !userAgent.includes('safari');

    // 2. 특정 WebView 환경 변수 확인
    const hasWebViewInterface = (window as any).webkit || (window as any).Android;

    // 3. 브라우저가 아닌 환경 감지
    const isNotBrowser = !(window as any).chrome && !window.navigator.userAgent.includes('Firefox');

    return isAndroidWebView || isIOSWebView || hasWebViewInterface || isNotBrowser;
  }

  private removeTokenFromUrl(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    window.history.replaceState({}, document.title, url.toString());
  }
}

export default WebViewManager;

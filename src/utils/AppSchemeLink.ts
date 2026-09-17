// 앱 스킴 이동과 스토어 폴백. `camp-share`·`gear-share` 랜딩이 각자 갖고 있던 것과 같은 방식이다
// (스킴 이동 → 1.5초 타이머 → visibilitychange로 앱이 열렸으면 취소, 아니면 스토어).
// 그룹 초대 랜딩(GRP-3)이 같은 동작을 써야 해서 한곳으로 뽑았다.

// 앱 설치 화면(src/app-install/AppInstallView.tsx)과 같은 스토어 링크.
export const APP_STORE_URL = 'https://apps.apple.com/kr/app/id6751174681';
export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.doublejbs.useless';

const FALLBACK_DELAY = 1500;

export const getUserAgent = () => {
  return typeof navigator === 'undefined' ? '' : navigator.userAgent;
};

export const isIOSDevice = () => {
  return /iPhone|iPad|iPod/i.test(getUserAgent());
};

export const isAndroidDevice = () => {
  return /Android/i.test(getUserAgent());
};

export const isMobileDevice = () => {
  return isIOSDevice() || isAndroidDevice();
};

export const getStoreUrl = () => {
  return isAndroidDevice() ? PLAY_STORE_URL : APP_STORE_URL;
};

export const openAppScheme = (scheme: string) => {
  const storeUrl = getStoreUrl();

  // 데스크톱에서는 커스텀 스킴을 호출하지 않고 스토어로 안내한다.
  if (!isMobileDevice()) {
    window.location.href = storeUrl;

    return;
  }

  let fallback: ReturnType<typeof setTimeout> | null = null;

  const cancelFallback = () => {
    if (fallback !== null) {
      clearTimeout(fallback);
      fallback = null;
    }

    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };

  // 앱이 열리면 페이지가 백그라운드로 가므로, visibility가 바뀌면 스토어 폴백을 취소한다.
  const handleVisibilityChange = () => {
    if (document.hidden) {
      cancelFallback();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  fallback = setTimeout(() => {
    cancelFallback();
    window.location.href = storeUrl;
  }, FALLBACK_DELAY);

  window.location.href = scheme;
};

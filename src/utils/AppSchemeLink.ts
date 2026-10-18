import StoreCampaignType from './StoreCampaignType';
import StoreMediumType from './StoreMediumType';
import { getAppStoreUrl, getPlayStoreUrl } from './StoreLinks';

// 앱 스킴 이동과 스토어 폴백의 단일 소스.
// 스킴 이동 → 1.5초 타이머 → visibilitychange로 앱이 열렸으면 취소, 아니면 스토어.
// 그룹 초대(GRP-3)·장비 공유(GD-7)·박지 공유(CS-7) 랜딩이 모두 이 함수를 쓴다.

// 스토어 링크(캠페인 태그 포함)는 `src/utils/StoreLinks.ts`가 만든다.

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

// 기기에 맞는 스토어 링크. Android가 아니면(iOS·데스크톱) App Store로 보낸다.
export const getStoreUrl = (campaign: StoreCampaignType, medium: StoreMediumType) => {
  return isAndroidDevice() ? getPlayStoreUrl(campaign, medium) : getAppStoreUrl(campaign);
};

// `campaign`은 이 스킴을 여는 랜딩 페이지 — 앱이 없어 스토어로 폴백될 때 그 링크에 실린다.
export const openAppScheme = (scheme: string, campaign: StoreCampaignType) => {
  const storeUrl = getStoreUrl(campaign, StoreMediumType.DeepLinkFallback);

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

import StoreCampaignType from './StoreCampaignType';
import StoreMediumType from './StoreMediumType';

// 웹이 만드는 모든 스토어 링크의 단일 소스(docs/landing/StoreCampaignLinks.md).
// iOS 앱 ID·Android 패키지는 앱 레포 `app.json`의 `ios.bundleIdentifier`·`android.package`
// (`com.doublejbs.useless`)와 손으로 맞춘 값이다. 앱 쪽이 바뀌면 여기도 함께 고친다.
// 서버 렌더 페이지(functions/groupInviteHtml.js)는 같은 형식을 직접 들고 있다.
const APP_STORE_BASE_URL = 'https://apps.apple.com/app/apple-store/id6751174681';
const APP_STORE_PROVIDER_TOKEN = '129546318';
const PLAY_STORE_BASE_URL = 'https://play.google.com/store/apps/details';
const PLAY_STORE_PACKAGE = 'com.doublejbs.useless';
const UTM_SOURCE = 'lessismore_web';

export const getAppStoreUrl = (campaign: StoreCampaignType) => {
  const params = new URLSearchParams({ pt: APP_STORE_PROVIDER_TOKEN, ct: campaign, mt: '8' });

  return `${APP_STORE_BASE_URL}?${params.toString()}`;
};

export const getPlayStoreUrl = (campaign: StoreCampaignType, medium: StoreMediumType) => {
  const referrer = new URLSearchParams({
    utm_source: UTM_SOURCE,
    utm_medium: medium,
    utm_campaign: campaign,
  });
  const params = new URLSearchParams({ id: PLAY_STORE_PACKAGE, referrer: referrer.toString() });

  return `${PLAY_STORE_BASE_URL}?${params.toString()}`;
};

// 상단 배너처럼 여러 페이지에 걸리는 링크가 지금 페이지를 캠페인으로 고른다.
export const getCampaignByPathname = (pathname: string) => {
  const CAMPAIGN_BY_PREFIX: [string, StoreCampaignType][] = [
    ['/bag-share/', StoreCampaignType.BagShare],
    ['/camp-share/', StoreCampaignType.CampShare],
    ['/gear-share/', StoreCampaignType.GearShare],
    ['/group/', StoreCampaignType.GroupInvite],
    ['/celebrate', StoreCampaignType.Celebrate],
    ['/app-install', StoreCampaignType.AppInstall],
  ];

  if (pathname === '/') {
    return StoreCampaignType.AppIntro;
  }

  const matched = CAMPAIGN_BY_PREFIX.find(([prefix]) => pathname.startsWith(prefix));

  return matched ? matched[1] : StoreCampaignType.Other;
};

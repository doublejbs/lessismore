# 스토어 캠페인 링크

| 항목 | 내용 |
|---|---|
| 목적 | 웹의 어느 채널(페이지·버튼)이 설치를 만드는지 스토어 리포트에서 나눠 본다 (2026-10-08 결정) |
| 코드 | `src/utils/StoreLinks.ts`(링크 생성 단일 소스) · `src/utils/StoreCampaignType.ts`(캠페인) · `src/utils/StoreMediumType.ts`(위치) · `src/utils/AppSchemeLink.ts`(앱 스킴 폴백) · `functions/groupInviteHtml.js`(서버 최소 HTML, 값 직접 보유) |

## 1. 규칙

- 웹이 만드는 **모든 스토어 링크는 캠페인 태그를 단다.** 태그 없는 스토어 주소를 코드에 새로 쓰지 않는다 — `getAppStoreUrl(campaign)` / `getPlayStoreUrl(campaign, medium)`을 쓴다.
- **캠페인 = 링크를 보여 준 페이지**, **위치(medium) = 그 페이지 안의 버튼 종류**다.
- App Store 캠페인 링크는 `ct` 하나뿐이라 위치는 싣지 않는다. 캠페인당 설치 5건 미만은 ASC 리포트에 나오지 않으므로 캠페인을 위치까지 쪼개지 않는다.
- 여러 페이지에 걸리는 링크(상단 배너·팝업)는 호출부가 페이지 캠페인을 `campaign` prop으로 넘긴다. 상단 배너는 `App.tsx`가 `getCampaignByPathname(pathname)`으로 고른다.
- 앱 스킴·딥링크 동작은 바꾸지 않는다. 바뀐 것은 스토어로 폴백될 때의 주소뿐이다. `/app-install`의 모바일 즉시 이동도 그대로다.
- 캠페인 값을 바꾸면 리포트의 과거 집계와 끊긴다. 바꿀 때는 이 문서를 먼저 고친다.

## 2. 링크 형식

**App Store** (ASC에서 이 앱으로 생성한 캠페인 링크 형식, `pt` = 앱 이전 후 현재 소유 팀의 provider token)

```
https://apps.apple.com/app/apple-store/id6751174681?pt=129546318&ct=<campaign>&mt=8
```

- `ct`는 40자 이하.

**Google Play** (`referrer`는 URL 인코딩한 UTM 쿼리)

```
https://play.google.com/store/apps/details?id=com.doublejbs.useless&referrer=utm_source%3Dlessismore_web%26utm_medium%3D<medium>%26utm_campaign%3D<campaign>
```

- 웹 자체 채널은 `utm_source=lessismore_web`으로 고정한다.

## 3. 캠페인 표

| 캠페인(`ct`·`utm_campaign`) | 페이지 | 위치(`utm_medium`) | 코드 |
|---|---|---|---|
| `app_intro` | 앱 소개 `/` | `badge` (머리·히어로·마무리 배지) | `StoreBadgesView` |
| `app_install` | `/app-install` (+ 알 수 없는 주소 `*` 폴백) | `redirect` (모바일 즉시 이동·설치 버튼) | `AppInstallView` |
| `bag_share` | 배낭 공유 `/bag-share/:id` | `banner` | `AndroidAppBannerView` |
| `camp_share` | 박지 공유 `/camp-share/:id` | `deeplink_fallback`, `banner` | `CampShareView` → `openAppScheme` |
| `gear_share` | 장비 공유 `/gear-share/:id` | `deeplink_fallback`, `banner` | `GearShareView` → `openAppScheme` |
| `group_invite` | 그룹 초대 `/group/:id` | `deeplink_fallback`, `banner`, `server_fallback`(템플릿을 못 가져왔을 때 서버 최소 HTML) | `GroupInviteView` → `openAppScheme`, `functions/groupInviteHtml.js` |
| `celebrate` | `/celebrate` | `banner` | `AndroidAppBannerView` |
| `web_other` | 그 밖의 페이지(`/login`·`/info` 등) | `banner` | `AndroidAppBannerView` |

- `/`·`/app-install`·`/privacy`에서는 배너를 띄우지 않는다(현재 동작). 표의 `banner`는 배너가 뜨는 페이지에만 해당한다.
- `popup`: `AppInstallPopupView`(웹 서비스 종료 안내 팝업)는 지금 어디서도 렌더하지 않는다. 다시 쓰면 띄우는 페이지의 캠페인을 prop으로 넘긴다.
- 데스크톱에서 `앱에서 열기`를 누르면 스킴 없이 App Store로 가며, 이때도 같은 캠페인이 붙는다.

## 4. 결과 보는 곳

| 어디 | 경로 | 비고 |
|---|---|---|
| App Store Connect | 앱 분석 > 획득(유입 경로) > **캠페인** | `ct` 별 노출·다운로드. **캠페인당 설치 5건 이상**이어야 표시된다. 옵트인한 사용자만 집계 |
| Google Play Console | 통계 > **획득 보고서** > 추적 채널(UTM) | `utm_source`·`utm_medium`·`utm_campaign` 별 스토어 방문·설치 |
| GA4 (Android) | `first_open` 이벤트의 source / medium / campaign (트래픽 획득·사용자 획득) | Android install referrer로 들어온다. iOS는 GA4가 캠페인을 받지 못한다 |

## 5. 유료 광고 링크

광고 설치를 웹 자체 채널(오가닉)과 섞지 않도록 광고 링크는 아래 규칙으로 만든다. (9/2~3 설치 급증이 광고에서 왔다 — 태그가 없으면 이런 급증의 출처를 다시 나눌 수 없다.)

- App Store: `ct=ads_<platform>_<yyyymm>` — 예 `ct=ads_meta_202610`, `ct=ads_naver_202610`
  ```
  https://apps.apple.com/app/apple-store/id6751174681?pt=129546318&ct=ads_meta_202610&mt=8
  ```
- Google Play: `utm_source=<platform>&utm_medium=paid&utm_campaign=<yyyymm>`
  ```
  https://play.google.com/store/apps/details?id=com.doublejbs.useless&referrer=utm_source%3Dmeta%26utm_medium%3Dpaid%26utm_campaign%3D202610
  ```
- `<platform>`은 소문자 한 단어(`meta`·`naver`·`kakao`·`google`·`instagram` 등). 같은 광고 플랫폼은 늘 같은 이름을 쓴다.
- 광고 플랫폼이 자체 앱 설치 추적(SKAdNetwork·Google Ads 앱 캠페인 등)을 쓰면 그 리포트가 우선이고, 위 태그는 스토어 쪽에서 오가닉과 나누는 용도다.
- 웹 자체 링크(`utm_source=lessismore_web`)와 광고 링크(`utm_medium=paid`)는 값이 겹치지 않는다.

// 스토어 링크의 위치(같은 페이지 안 어느 버튼인지). Google Play `utm_medium`에만 실린다.
// App Store 캠페인 링크에는 `ct` 하나뿐이라 위치는 싣지 않는다(캠페인당 설치 5건 미만은 리포트에 안 보여 쪼개지 않는다).
enum StoreMediumType {
  Badge = 'badge',
  Redirect = 'redirect',
  Banner = 'banner',
  Popup = 'popup',
  DeepLinkFallback = 'deeplink_fallback',
}

export default StoreMediumType;

// 스토어 링크의 캠페인 = 설치를 만든 "우리 채널(페이지)".
// App Store `ct`(40자 이하)와 Google Play `utm_campaign`에 같은 값이 들어간다.
// 값을 바꾸면 스토어 리포트의 과거 집계와 끊기므로 docs/landing/StoreCampaignLinks.md와 함께만 고친다.
enum StoreCampaignType {
  AppIntro = 'app_intro',
  AppInstall = 'app_install',
  BagShare = 'bag_share',
  CampShare = 'camp_share',
  GearShare = 'gear_share',
  GroupInvite = 'group_invite',
  Celebrate = 'celebrate',
  Other = 'web_other',
}

export default StoreCampaignType;

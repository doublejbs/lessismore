// 그룹 초대 랜딩(GRP-3)의 로드 상태.
// 미러 문서 없음과 읽기 실패는 방문자가 할 수 있는 일이 같아서 한 화면(Unavailable)으로 모으고,
// 앱으로 넘길 groupId 자체가 없는 잘못된 링크만 따로 갈린다.
enum GroupInviteStatus {
  Loading = 'Loading',
  Ready = 'Ready',
  // URL에 groupId가 없다 — `잘못된 초대 링크예요`.
  InvalidLink = 'InvalidLink',
  // 미러 문서가 없거나(결과적 일관성) 읽기가 실패했다 — 그룹 정보 없이 앱 열기만 남기는 축소 형태.
  Unavailable = 'Unavailable',
}

export default GroupInviteStatus;

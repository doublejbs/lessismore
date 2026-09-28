// 스토어 버튼 묶음에서 기기에 맞는 스토어 버튼 하나를 얼마나 강조할지.
// 라임은 화면당 주 액션 하나(히어로)에만 쓴다 — 머리·마무리 묶음은 라임을 쓰지 않는다(AppIntroSpec §4).
enum StoreButtonEmphasisType {
  Lime = 'Lime',
  Ink = 'Ink',
  None = 'None',
}

export default StoreButtonEmphasisType;

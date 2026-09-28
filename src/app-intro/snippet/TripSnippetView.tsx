import { FC } from 'react';

// 여행: 큰 숫자 총 무게 + D-day + 예보 한 줄(AppIntroSpec §3.3).
// 한글이 섞인 예보 값은 콘덴스드가 아니라 Pretendard로 둔다(앱 HM-8).
const TripSnippetView: FC = () => {
  return (
    <div className='app-intro-surface app-intro-trip'>
      <div className='app-intro-trip-head'>
        <p className='app-intro-row-name'>설악산 공룡능선</p>
        <p className='app-intro-number app-intro-trip-dday'>D-6</p>
      </div>
      <p className='app-intro-number app-intro-trip-weight'>5.36kg</p>
      <p className='app-intro-meta-label'>총 무게</p>
      <p className='app-intro-trip-forecast'>맑음 12°/21° · 10월 4일 출발</p>
    </div>
  );
};

export default TripSnippetView;

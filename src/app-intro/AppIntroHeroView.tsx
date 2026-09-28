import { FC } from 'react';
import DevicePlatform from './model/DevicePlatform';
import StoreButtonEmphasisType from './model/StoreButtonEmphasisType';
import StoreButtonsView from './StoreButtonsView';

interface Props {
  platform: DevicePlatform;
}

// 첫 화면: 제목·부제·스토어 버튼(AppIntroSpec §3.2). 기기에 맞는 스토어 하나가 이 화면의 유일한 라임이다.
const AppIntroHeroView: FC<Props> = ({ platform }) => {
  return (
    <section className='app-intro-hero'>
      <div className='app-intro-inner'>
        <h1 className='app-intro-hero-title'>
          {/* 좁은 화면에서 "배낭은 / 가볍게"로 끊기지 않게 구절 단위로 묶는다. */}
          <span className='app-intro-nowrap'>필요한 장비만,</span>{' '}
          <span className='app-intro-nowrap'>배낭은 가볍게</span>
        </h1>
        <p className='app-intro-hero-subtitle'>
          장비 무게를 정리하고, 여행을 준비하고, 함께 가는 사람과 나누세요.
        </p>
        <StoreButtonsView platform={platform} emphasis={StoreButtonEmphasisType.Lime} />
      </div>
    </section>
  );
};

export default AppIntroHeroView;

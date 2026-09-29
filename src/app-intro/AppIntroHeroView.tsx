import { FC } from 'react';
import StoreBadgesView from './StoreBadgesView';

// 첫 화면: 제목·부제·스토어 배지(AppIntroSpec §3.2).
const AppIntroHeroView: FC = () => {
  return (
    <section className='app-intro-hero'>
      <div className='app-intro-inner'>
        <h1 className='app-intro-hero-title'>
          {/* 좁은 화면에서 "배낭은 / 가볍게"로 끊기지 않게 구절 단위로 묶는다. */}
          <span className='app-intro-nowrap'>필요한 장비만,</span>{' '}
          <span className='app-intro-nowrap'>배낭은 가볍게</span>
        </h1>
        <p className='app-intro-hero-subtitle'>
          장비 무게를 정리하고, 백패킹을 준비하고, 함께 가는 사람과 나누세요.
        </p>
        <StoreBadgesView />
      </div>
    </section>
  );
};

export default AppIntroHeroView;

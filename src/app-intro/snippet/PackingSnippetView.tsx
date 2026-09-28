import { FC } from 'react';

const PACKED_COUNT = 9;
const TOTAL_COUNT = 10;

// 패킹: 진행 막대 9/10(AppIntroSpec §3.3). 라임은 히어로 주 액션 전용이라 채움은 잉크다.
const PackingSnippetView: FC = () => {
  const progressPercent = (PACKED_COUNT / TOTAL_COUNT) * 100;

  return (
    <div className='app-intro-packing'>
      <div className='app-intro-packing-head'>
        <p className='app-intro-number app-intro-packing-count'>
          {PACKED_COUNT}/{TOTAL_COUNT}
        </p>
        <p className='app-intro-packing-caption'>챙겼어요</p>
      </div>
      <div className='app-intro-progress-track'>
        <div className='app-intro-progress-fill' style={{ width: `${progressPercent}%` }} />
      </div>
      <p className='app-intro-packing-remain'>남은 장비 1개 · 헤드랜턴</p>
    </div>
  );
};

export default PackingSnippetView;

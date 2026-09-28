import { FC } from 'react';
import StoreBadgesView from './StoreBadgesView';

// 마무리 스토어 배지(AppIntroSpec §3.4).
const AppIntroClosingView: FC = () => {
  return (
    <section className='app-intro-closing'>
      <div className='app-intro-inner'>
        <h2 className='app-intro-closing-title'>지금 시작해 보세요</h2>
        <StoreBadgesView />
      </div>
    </section>
  );
};

export default AppIntroClosingView;

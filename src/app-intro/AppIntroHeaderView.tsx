import { FC } from 'react';
import StoreBadgesView from './StoreBadgesView';

// 머리: 워드마크 + 스토어 배지 두 개(AppIntroSpec §3.1). 모바일에서는 바로 아래 히어로에 같은 배지가 있어 CSS로 숨긴다.
const AppIntroHeaderView: FC = () => {
  return (
    <header className='app-intro-header'>
      <div className='app-intro-inner app-intro-header-inner'>
        <img className='app-intro-wordmark' src='/logo.png' alt='useless' />
        <StoreBadgesView isCompact />
      </div>
    </header>
  );
};

export default AppIntroHeaderView;

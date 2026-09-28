import { FC } from 'react';
import DevicePlatform from './model/DevicePlatform';
import StoreButtonEmphasisType from './model/StoreButtonEmphasisType';
import StoreButtonsView from './StoreButtonsView';

interface Props {
  platform: DevicePlatform;
}

// 머리: 워드마크 + 스토어 버튼 두 개(AppIntroSpec §3.1). 라임은 히어로에만 두므로 여기는 강조하지 않는다.
const AppIntroHeaderView: FC<Props> = ({ platform }) => {
  return (
    <header className='app-intro-header'>
      <div className='app-intro-inner app-intro-header-inner'>
        <img className='app-intro-wordmark' src='/logo.png' alt='useless' />
        <StoreButtonsView platform={platform} emphasis={StoreButtonEmphasisType.None} isCompact />
      </div>
    </header>
  );
};

export default AppIntroHeaderView;

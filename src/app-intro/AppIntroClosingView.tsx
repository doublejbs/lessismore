import { FC } from 'react';
import DevicePlatform from './model/DevicePlatform';
import StoreButtonEmphasisType from './model/StoreButtonEmphasisType';
import StoreButtonsView from './StoreButtonsView';

interface Props {
  platform: DevicePlatform;
}

// 마무리 스토어 버튼(AppIntroSpec §3.4). 라임은 히어로에만 — 여기 주 스토어는 잉크 채움이다.
const AppIntroClosingView: FC<Props> = ({ platform }) => {
  return (
    <section className='app-intro-closing'>
      <div className='app-intro-inner'>
        <h2 className='app-intro-closing-title'>지금 시작해 보세요</h2>
        <StoreButtonsView platform={platform} emphasis={StoreButtonEmphasisType.Ink} />
      </div>
    </section>
  );
};

export default AppIntroClosingView;

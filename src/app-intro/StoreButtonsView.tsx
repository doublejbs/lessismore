import { FC } from 'react';
import { APP_STORE_URL, PLAY_STORE_URL } from '../utils/AppSchemeLink';
import DevicePlatform from './model/DevicePlatform';
import StoreButtonEmphasisType from './model/StoreButtonEmphasisType';

interface Props {
  platform: DevicePlatform;
  emphasis: StoreButtonEmphasisType;
  isCompact?: boolean;
}

// App Store / Google Play 알약 버튼 두 개. 같은 탭으로 이동한다(AppIntroSpec §5).
// 외부 배지 이미지를 쓰지 않고 글자 알약으로 그린다.
const StoreButtonsView: FC<Props> = ({ platform, emphasis, isCompact = false }) => {
  const isGooglePlayPrimary = platform.isGooglePlayPrimary();
  const primaryClassName = `app-intro-store-button app-intro-store-button--${emphasis.toLowerCase()}`;
  const secondaryClassName = 'app-intro-store-button app-intro-store-button--none';
  const sizeClassName = isCompact ? ' app-intro-store-button--compact' : '';
  const appStoreClassName =
    (isGooglePlayPrimary ? secondaryClassName : primaryClassName) + sizeClassName;
  const googlePlayClassName =
    (isGooglePlayPrimary ? primaryClassName : secondaryClassName) + sizeClassName;

  return (
    <div className='app-intro-store-buttons'>
      <a className={appStoreClassName} href={APP_STORE_URL}>
        App Store
      </a>
      <a className={googlePlayClassName} href={PLAY_STORE_URL}>
        Google Play
      </a>
    </div>
  );
};

export default StoreButtonsView;

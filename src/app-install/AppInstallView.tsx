import { useEffect } from 'react';
import './AppInstallView.css';
import { getAppStoreUrl, getPlayStoreUrl } from '../utils/StoreLinks';
import StoreCampaignType from '../utils/StoreCampaignType';
import StoreMediumType from '../utils/StoreMediumType';

// `*` 폴백도 여기로 오므로, 알 수 없는 주소로 들어온 설치도 app_install로 잡힌다.
const APP_STORE_URL = getAppStoreUrl(StoreCampaignType.AppInstall);
const PLAY_STORE_URL = getPlayStoreUrl(StoreCampaignType.AppInstall, StoreMediumType.Redirect);

const AppInstallView = () => {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  const handleInstallClick = () => {
    if (isIOS) {
      window.location.href = APP_STORE_URL;
    } else if (isAndroid) {
      window.location.href = PLAY_STORE_URL;
    }
  };

  useEffect(() => {
    if (isIOS) {
      window.location.href = APP_STORE_URL;
    } else if (isAndroid) {
      window.location.href = PLAY_STORE_URL;
    }
  }, [isIOS, isAndroid]);

  return (
    <div className='app-install-container'>
      <div className='app-install-content'>
        <img src='/icon.png' alt='앱 아이콘' className='app-icon' />

        <img src='/logo.png' alt='로고' className='app-logo' />

        <button onClick={handleInstallClick} className='install-button'>
          앱 설치하기
        </button>

        <div className='install-message'>
          {isIOS && '앱스토어로 이동합니다'}
          {isAndroid && '플레이스토어로 이동합니다'}
          {!isIOS && !isAndroid && '모바일 기기에서 접속해주세요'}
        </div>
      </div>
    </div>
  );
};

export default AppInstallView;

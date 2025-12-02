import { useEffect } from 'react';
import './AppInstallView.css';

const AppInstallView = () => {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const appStoreUrl = 'https://apps.apple.com/kr/app/id6751174681';
  const playStoreUrl = 'https://play.google.com/store/apps/details?id=kr.co.useless.app';

  const handleInstallClick = () => {
    if (isIOS) {
      window.location.href = appStoreUrl;
    } else if (isAndroid) {
      window.location.href = playStoreUrl;
    }
  };

  useEffect(() => {
    if (isIOS) {
      window.location.href = appStoreUrl;
    } else if (isAndroid) {
      window.location.href = playStoreUrl;
    }
  }, [isIOS, isAndroid, appStoreUrl, playStoreUrl]);

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

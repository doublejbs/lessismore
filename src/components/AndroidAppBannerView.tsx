import { useState, useEffect, FC } from 'react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.doublejbs.useless';
const APP_STORE_URL = 'https://apps.apple.com/app/id6751174681';
const BANNER_DISMISSED_KEY = 'app-banner-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000;

const AndroidAppBannerView: FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null);

  useEffect(() => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const dismissedAt = localStorage.getItem(BANNER_DISMISSED_KEY);
    const isDismissed = dismissedAt && Date.now() - parseInt(dismissedAt) < DISMISS_DURATION;

    if (!isDismissed) {
      if (isAndroid) {
        setPlatform('android');
        setShowBanner(true);
      } else if (isIOS) {
        setPlatform('ios');
        setShowBanner(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, Date.now().toString());
    setShowBanner(false);
  };

  const handleInstall = () => {
    const url = platform === 'android' ? PLAY_STORE_URL : APP_STORE_URL;
    window.open(url, '_blank');
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        color: '#000',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 9999,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: '#666',
          fontSize: '20px',
          padding: '0 8px 0 0',
          cursor: 'pointer',
          lineHeight: 1,
        }}
      >
        ✕
      </button>

      <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '12px' }}>
        <img
          src='/icon.png'
          alt='USELESS'
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '14px' }}>USELESS</div>
          <div style={{ fontSize: '12px', color: '#666' }}>앱 설치하기</div>
        </div>
      </div>

      <button
        onClick={handleInstall}
        style={{
          backgroundColor: '#000',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        설치
      </button>
    </div>
  );
};

export default AndroidAppBannerView;

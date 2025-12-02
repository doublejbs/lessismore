import { useState, useEffect, FC } from 'react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.doublejbs.useless';
const APP_STORE_URL = 'https://apps.apple.com/app/useless/id6751174681';
const POPUP_NEVER_SHOW_KEY = 'app-install-popup-never-show';

const AppInstallPopupView: FC = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [neverShowAgain, setNeverShowAgain] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    const neverShow = localStorage.getItem(POPUP_NEVER_SHOW_KEY);

    if ((isIOS || isAndroid) && !neverShow) {
      setPlatform(isIOS ? 'ios' : 'android');
      setShowPopup(true);
    }
  }, []);

  const handleClose = () => {
    if (neverShowAgain) {
      localStorage.setItem(POPUP_NEVER_SHOW_KEY, 'true');
    }
    setShowPopup(false);
  };

  const handleInstall = () => {
    if (neverShowAgain) {
      localStorage.setItem(POPUP_NEVER_SHOW_KEY, 'true');
    }
    const url = platform === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
    window.open(url, '_blank');
    setShowPopup(false);
  };

  if (!showPopup) {
    return null;
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
        onClick={handleClose}
      >
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            position: 'relative',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              color: '#666',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              lineHeight: 1,
            }}
          >
            ✕
          </button>

          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <img
              src='/icon.png'
              alt='USELESS'
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '16px',
                marginBottom: '16px',
                display: 'block',
                margin: '0 auto 16px',
              }}
            />
            <p
              style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '24px',
                margin: '8px 0 24px',
              }}
            >
              앱으로 더 편리하게
              <br />
              백패킹 장비를 관리하세요
            </p>

            <button
              onClick={handleInstall}
              style={{
                width: '100%',
                backgroundColor: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '16px',
              }}
            >
              {platform === 'ios' ? 'App Store에서 설치' : 'Play Store에서 설치'}
            </button>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#666',
              }}
            >
              <input
                type='checkbox'
                checked={neverShowAgain}
                onChange={(e) => setNeverShowAgain(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                }}
              />
              다시 보지 않기
            </label>
          </div>
        </div>
      </div>
    </>
  );
};

export default AppInstallPopupView;

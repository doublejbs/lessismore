import { useState, useEffect, FC } from 'react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.doublejbs.useless';
const APP_STORE_URL = 'https://apps.apple.com/app/useless/id6751174681';

const AppInstallPopupView: FC = () => {
  const [showPopup, setShowPopup] = useState(true);
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isIOS || isAndroid) {
      setPlatform(isIOS ? 'ios' : 'android');
    }
  }, []);

  const handleClose = () => {
    setShowPopup(false);
  };

  const handleInstall = () => {
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
            maxWidth: '400px',
            maxHeight: '90vh',
            width: '100%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
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
              zIndex: 1,
            }}
          >
            ✕
          </button>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
            }}
          >
            <div style={{ marginTop: '8px' }}>
              <img
                src='/icon.png'
                alt='USELESS'
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '16px',
                  display: 'block',
                  margin: '0 auto 12px',
                }}
              />
              <img
                src='/logo.png'
                alt='USELESS Logo'
                style={{
                  width: '120px',
                  display: 'block',
                  margin: '0 auto 16px',
                }}
              />
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#000',
                  marginBottom: '20px',
                  textAlign: 'center',
                }}
              >
                🔔 웹 서비스 종료 및 앱 전환 안내
              </h2>

              <div
                style={{
                  fontSize: '14px',
                  color: '#333',
                  lineHeight: '1.6',
                  textAlign: 'left',
                }}
              >
                <p style={{ marginBottom: '12px' }}>
                  그동안 저희 USELESS의 웹 서비스를 이용해 주신 모든 분들께 진심으로 감사드립니다.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  더 나은 사용자 경험과 안정적인 기능 제공을 위해, 새로운 앱 서비스를 공식
                  오픈했습니다.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  이에 따라 <strong>2025년 12월 8일</strong>부로 웹 서비스 운영을 종료하며, 앞으로는
                  앱에서 동일한 기능을 더욱 편리하게 이용하실 수 있습니다.
                </p>
                <ul style={{ marginBottom: '12px' }}>
                  <li style={{ marginBottom: '8px' }}>
                    - 기존 계정 정보와 이용 내역은 모두 안전하게 유지됩니다.
                  </li>
                  <li>
                    - 아래 링크를 통해 앱을 다운로드하신 후, 기존 계정으로 그대로 로그인하시면
                    됩니다.
                  </li>
                </ul>
                <p style={{ marginBottom: '12px' }}>
                  앞으로도 더욱 향상된 서비스로 찾아뵙겠습니다.
                </p>
                <p style={{ fontWeight: 600 }}>감사합니다.</p>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '16px 24px 24px',
              borderTop: '1px solid #f0f0f0',
              backgroundColor: '#fff',
              borderRadius: '0 0 12px 12px',
            }}
          >
            <button
              onClick={handleInstall}
              style={{
                width: '100%',
                backgroundColor: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              앱 설치하기
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AppInstallPopupView;

import { useEffect } from 'react';

const OpenBrowserView = () => {
  const ua = navigator.userAgent.toLowerCase();

  useEffect(() => {
    window.open('https://lessismore-7e070.web.app', '_blank');
  }, []);

  if (ua.includes('instagram') || ua.includes('fbav')) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <p>
          👉 우측 상단 <strong>•••</strong> → <strong>"브라우저에서 열기"</strong>를 눌러주세요.
        </p>
      </div>
    );
  } else {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <button
          onClick={() => {
            window.open('https://lessismore-7e070.web.app', '_blank');
          }}
          style={{
            backgroundColor: 'black',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: '500',
          }}
        >
          기본 브라우저에서 확인
        </button>
      </div>
    );
  }
};

export default OpenBrowserView;

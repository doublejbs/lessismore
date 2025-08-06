import { useEffect } from 'react';

const InstagramWebView = () => {
  useEffect(() => {
    window.location.href = 'x-safari-https://useless.my';
  }, []);


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
        👉 우측 상단 <strong>•••</strong> → <strong>&quot;외부 브라우저에서 열기&quot;</strong>를 눌러주세요.
      </p>
    </div>
  );
};

export default InstagramWebView;
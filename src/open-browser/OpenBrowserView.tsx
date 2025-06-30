import { useEffect } from 'react';

const OpenBrowserView = () => {
  useEffect(() => {
    window.open('https://useless.my', '_blank');
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
      <button
        style={{
          backgroundColor: 'black',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          fontWeight: '500',
          border: 'none',
          cursor: 'pointer',
          transition: 'background-color 0.2s ease',
        }}
        onClick={() => {
          window.open('https://useless.my', '_blank');
        }}
      >
        useless.my
      </button>
    </div>
  );
};

export default OpenBrowserView;

import { observer } from 'mobx-react-lite';
import { FC, useState } from 'react';
import usePreventScroll from '../../hooks/usePreventScroll';
import BagDetail from '../model/BagDetail';

interface Props {
  bagDetail: BagDetail;
}

const ShareButtonView: FC<Props> = ({ bagDetail }) => {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const shared = bagDetail.isShared();
  const url = bagDetail.getUrl();

  usePreventScroll(showModal);

  const handleShareButtonClick = () => {
    setShowModal(!showModal);
  };

  const handleShare = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsLoading(true);

    try {
      if (shared) {
        await bagDetail.unshare();
      } else {
        await bagDetail.share();

        try {
          await window.navigator.clipboard.writeText(url);
          window.alert('공유 링크가 클립보드에 복사되었습니다.');
        } catch (error) {
          document.execCommand('copy', true, url);
          window.alert('공유 링크가 클립보드에 복사되었습니다.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      alert('링크가 클립보드에 복사되었습니다.');
    } catch (error) {
      console.error('복사 실패:', error);
      alert('복사에 실패했습니다.');
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute',
          right: '0.5rem',
          top: '0',
          cursor: 'pointer',
          padding: '1rem 0.5rem',
        }}
        onClick={handleShareButtonClick}
      >
        <svg
          width='28'
          height='28'
          viewBox='0 0 24 24'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path d='M12 4L12 16' stroke='#333' strokeWidth='2' strokeLinecap='round' />
          <path
            d='M8 8L12 4L16 8'
            stroke='#333'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
          <path
            d='M6 10V18C6 19.1046 6.89543 20 8 20H16C17.1046 20 18 19.1046 18 18V10'
            stroke='#333'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </div>
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            width: '100%',
            height: '100%',
            zIndex: 40,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              width: '100%',
              position: 'fixed',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'white',
              bottom: '0',
              borderRadius: '16px 16px 0 0',
              padding: '24px',
              lineHeight: 1.4,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                marginBottom: '8px',
                textAlign: 'center',
              }}
            >
              {shared ? '배낭 공유 중' : '배낭 공유하기'}
            </div>
            <div
              style={{
                fontSize: '14px',
                color: '#666',
                textAlign: 'center',
                marginBottom: '20px',
              }}
            >
              {shared
                ? '현재 배낭이 공유되어 다른 사용자가 볼 수 있어요'
                : '배낭을 공유하면 다른 사용자가 볼 수 있어요'}
            </div>

            {shared && (
              <div
                style={{
                  backgroundColor: '#e8f5e8',
                  border: '1px solid #4caf50',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: '#4caf50',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width='10'
                    height='8'
                    viewBox='0 0 10 8'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <path
                      d='M1 4L3.5 6.5L9 1'
                      stroke='white'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </div>
                <span style={{ fontSize: '14px', color: '#2e7d32' }}>공유가 활성화되었습니다</span>
              </div>
            )}

            {shared && (
              <div
                style={{
                  backgroundColor: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  color: '#666',
                  wordBreak: 'break-all',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ flex: 1 }}>{url}</span>
                <button
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={handleCopyLink}
                >
                  <svg
                    width='16'
                    height='16'
                    viewBox='0 0 24 24'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <path
                      d='M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z'
                      fill='#666'
                    />
                  </svg>
                </button>
              </div>
            )}

            <button
              style={{
                width: '100%',
                backgroundColor: isLoading ? '#666' : 'black',
                color: 'white',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onClick={handleShare}
              disabled={isLoading}
            >
              {isLoading && (
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
              )}
              {isLoading ? '' : shared ? '공유 취소' : '공유하기'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default observer(ShareButtonView);

import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import usePreventScroll from '../../hooks/usePreventScroll';
import LoadingView from '../../LoadingView';
import LogInAlertManager from './LogInAlertManager';
interface Props {
  logInAlertManager: LogInAlertManager;
}

const LogInView: FC<Props> = ({ logInAlertManager }) => {
  const isVisible = logInAlertManager.isVisible();
  const isLoading = logInAlertManager.isLoading();

  usePreventScroll(isVisible, false);

  const handleClickCancel = () => {
    logInAlertManager.hide();
  };

  const handleClickConfirm = () => {
    logInAlertManager.confirm();
  };

  if (isVisible) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          width: '100%',
          height: '100%',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onClick={handleClickCancel}
      >
        <div
          style={{
            width: '350px',
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px 24px 20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              fontWeight: '1000',
              fontSize: '48px',
              textAlign: 'center',
              display: 'inline-block',
              lineHeight: 1,
              letterSpacing: '-4.5px',
            }}
          >
            useless
          </div>
          <div style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold' }}>
            로그인 후 이용 가능합니다
          </div>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              width: '100%',
              height: '51px',
              justifyContent: 'center',
            }}
          >
            {isLoading ? (
              <LoadingView />
            ) : (
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'black',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background 0.3s',
                }}
                onClick={handleClickConfirm}
              >
                <svg
                  style={{
                    width: '24px',
                    height: '24px',
                    marginRight: '10px',
                  }}
                  viewBox='0 0 24 24'
                >
                  <path
                    fill='#4285F4'
                    d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                  />
                  <path
                    fill='#34A853'
                    d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                  />
                  <path
                    fill='#FBBC05'
                    d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                  />
                  <path
                    fill='#EA4335'
                    d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                  />
                </svg>
                <span>Google로 로그인</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  } else {
    return null;
  }
};

export default observer(LogInView);

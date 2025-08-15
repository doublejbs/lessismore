import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import AlertManager from './AlertManager';
import usePreventScroll from '../hooks/usePreventScroll';

interface Props {
  alertManager: AlertManager;
}

const AlertView: FC<Props> = ({ alertManager }) => {
  const isVisible = alertManager.isVisible();
  const message = alertManager.getMessage();
  const confirmText = alertManager.getConfirmText();

  usePreventScroll(isVisible);

  const handleClickCancel = () => {
    alertManager.hide();
  };

  const handleClickConfirm = () => {
    alertManager.confirm();
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
        >
          <div
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
            }}
          >
            <span>{message}</span>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              width: '100%',
              height: '51px',
            }}
          >
            <button
              style={{
                width: '100%',
                backgroundColor: '#EEEEEE',
                height: '100%',
                borderRadius: '10px',
              }}
              onClick={handleClickCancel}
            >
              취소하기
            </button>
            <button
              style={{
                width: '100%',
                backgroundColor: 'black',
                color: 'white',
                height: '100%',
                borderRadius: '10px',
              }}
              onClick={handleClickConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    );
  } else {
    return null;
  }
};

export default observer(AlertView);

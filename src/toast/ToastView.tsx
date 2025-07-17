import { FC } from 'react';
import ToastManager from './ToastManager';
import { observer } from 'mobx-react-lite';

interface Props {
  toastManager: ToastManager;
  bottom: number;
}

const ToastView: FC<Props> = ({ toastManager, bottom }) => {
  const message = toastManager.getMessage();
  const isVisible = toastManager.isVisible();

  if (isVisible) {
    return (
      <div
        style={{
          position: 'absolute',
          bottom,
          width: '100%',
          margin: '0 auto',
          padding: '16px 20px',
          zIndex: 20,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderRadius: '10px',
          color: 'white',
        }}
      >
        {message}
      </div>
    );
  } else {
    return null;
  }
};

export default observer(ToastView);

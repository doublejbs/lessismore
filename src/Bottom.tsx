import { useLocation, useNavigate } from 'react-router-dom';
import ToastView from './toast/ToastView';
import app from './App';
import { observer } from 'mobx-react-lite';

const Bottom = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isBag = location.pathname === '/bag';
  const isWarehouse = location.pathname === '/warehouse';
  const toastManager = app.getToastManager();

  const handleClickWarehouse = () => {
    navigate('/warehouse');
  };

  const handleClickBag = () => {
    navigate('/bag');
  };

  return (
    <div
      style={{
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'fixed',
          width: '100%',
          bottom: '0px',
          height: 'calc(53px + env(safe-area-inset-bottom))',
          paddingBottom: 'env(safe-area-inset-bottom)',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-around',
          left: 0,
          borderTop: '2px solid #EAEAEA',
          backgroundColor: 'white',
        }}
      >
        <button
          onClick={handleClickWarehouse}
          style={{
            fontWeight: isWarehouse ? 'bold' : 'normal',
            width: '100%',
          }}
        >
          내 장비
        </button>
        <button
          onClick={handleClickBag}
          style={{
            fontWeight: isBag ? 'bold' : 'normal',
            width: '100%',
          }}
        >
          배낭
        </button>
      </div>
      <ToastView toastManager={toastManager} bottom={46} />
    </div>
  );
};

export default observer(Bottom);

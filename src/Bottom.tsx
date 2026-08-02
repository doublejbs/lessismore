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

  // 내 장비 아이콘 (텐트)
  const WarehouseIcon = ({ isActive }: { isActive: boolean }) => (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      height='24px'
      viewBox='0 -960 960 960'
      width='24px'
      fill={isActive ? '#000000' : '#666666'}
    >
      <path d='M80-80v-186l350-472-70-94 64-48 56 75 56-75 64 48-70 94 350 472v186H80Zm400-591L160-240v80h120l200-280 200 280h120v-80L480-671ZM378-160h204L480-302 378-160Zm102-280 200 280-200-280-200 280 200-280Z' />
    </svg>
  );

  // 배낭 아이콘 (오스프리 스타일)
  const BagIcon = ({ isActive }: { isActive: boolean }) => (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      height='24px'
      viewBox='0 -960 960 960'
      width='24px'
      fill={isActive ? '#1f1f1f' : '#666666'}
    >
      <path d='m280-40 123-622q6-29 27-43.5t44-14.5q23 0 42.5 10t31.5 30l40 64q18 29 46.5 52.5T700-529v-71h60v560h-60v-406q-48-11-89-35t-71-59l-24 120 84 80v300h-80v-240l-84-80-72 320h-84Zm17-395-85-16q-16-3-25-16.5t-6-30.5l30-157q6-32 34-50.5t60-12.5l46 9-54 274Zm243-305q-33 0-56.5-23.5T460-820q0-33 23.5-56.5T540-900q33 0 56.5 23.5T620-820q0 33-23.5 56.5T540-740Z' />
    </svg>
  );

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
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            fontSize: '12px',
            color: isWarehouse ? '#000' : '#666',
          }}
        >
          <WarehouseIcon isActive={isWarehouse} />내 장비
        </button>
        <button
          onClick={handleClickBag}
          style={{
            fontWeight: isBag ? 'bold' : 'normal',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            fontSize: '12px',
            color: isBag ? '#000' : '#666',
          }}
        >
          <BagIcon isActive={isBag} />
          배낭
        </button>
      </div>
      <ToastView toastManager={toastManager} bottom={46} />
    </div>
  );
};

export default observer(Bottom);

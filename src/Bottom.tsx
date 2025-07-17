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
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
      {/* 텐트 (삼각형 형태) */}
      <path
        d='M2 20L12 6L22 20H2Z'
        stroke={isActive ? '#000' : '#666'}
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        fill='none'
      />
      {/* 텐트 입구 */}
      <path
        d='M12 20V14'
        stroke={isActive ? '#000' : '#666'}
        strokeWidth='2'
        strokeLinecap='round'
      />
    </svg>
  );

  // 배낭 아이콘 (오스프리 스타일)
  const BagIcon = ({ isActive }: { isActive: boolean }) => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
      {/* 메인 백팩 몸체 */}
      <path
        d='M8 7H16C17.1 7 18 7.9 18 9V20C18 21.1 17.1 22 16 22H8C6.9 22 6 21.1 6 20V9C6 7.9 6.9 7 8 7Z'
        stroke={isActive ? '#000' : '#666'}
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        fill='none'
      />
      {/* 상단 원형 뚜껑 (오스프리 특징) */}
      <circle
        cx='12'
        cy='7'
        r='4'
        stroke={isActive ? '#000' : '#666'}
        strokeWidth='2'
        fill='none'
      />
      {/* 어깨 스트랩 */}
      <path
        d='M8 7V4M16 7V4'
        stroke={isActive ? '#000' : '#666'}
        strokeWidth='2'
        strokeLinecap='round'
      />
      {/* 하단 컴파트먼트 구분선 */}
      <path
        d='M6 17H18'
        stroke={isActive ? '#000' : '#666'}
        strokeWidth='2'
        strokeLinecap='round'
      />
      {/* 사이드 압축 스트랩 */}
      <path
        d='M6 12H7M17 12H18'
        stroke={isActive ? '#000' : '#666'}
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      {/* 상단 뚜껑 손잡이 */}
      <path
        d='M11 5H13'
        stroke={isActive ? '#000' : '#666'}
        strokeWidth='2'
        strokeLinecap='round'
      />
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

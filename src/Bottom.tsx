import { useLocation, useNavigate } from 'react-router-dom';
import app from './App';

const Bottom = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isBag = location.pathname === '/bag';
  const isWarehouse = location.pathname === '/warehouse';
  const isAdventure = location.pathname === '/adventure';
  const firebase = app.getFirebase();
  const selectedKeys = isBag ? ['bag'] : isWarehouse ? ['warehouse'] : [];

  const handleClickWarehouse = () => {
    navigate('/warehouse');
  };

  const handleClickBag = () => {
    navigate('/bag');
  };

  return (
    <div
      style={{
        position: 'fixed',
        width: '100%',
        bottom: '0px',
        height: '56px',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-around',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#F0F0F0',
      }}
    >
      <button
        onClick={handleClickWarehouse}
        style={{
          fontWeight: isWarehouse ? 'bold' : 'normal',
        }}
      >
        창고
      </button>
      <button
        onClick={handleClickBag}
        style={{
          fontWeight: isBag ? 'bold' : 'normal',
        }}
      >
        배낭
      </button>
      <button
        onClick={handleClickBag}
        style={{
          fontWeight: isAdventure ? 'bold' : 'normal',
        }}
      >
        모험
      </button>
      {/* <Button onClick={handleClickLogout}>로그아웃</Button> */}
    </div>
  );
};

export default Bottom;

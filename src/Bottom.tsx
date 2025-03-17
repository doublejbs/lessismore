import { useLocation, useNavigate } from 'react-router-dom';

const Bottom = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isBag = location.pathname === '/bag';
  const isWarehouse = location.pathname === '/warehouse';
  const isSearch = location.pathname === '/search';

  const handleClickWarehouse = () => {
    navigate('/warehouse');
  };

  const handleClickBag = () => {
    navigate('/bag');
  };

  const handleClickSearch = () => {
    navigate('/search');
  };

  return (
    <div
      style={{
        position: 'fixed',
        width: '100%',
        bottom: '0px',
        height: 'calc(56px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-around',
        left: 0,
        backgroundColor: '#F0F0F0',
      }}
    >
      <button
        onClick={handleClickSearch}
        style={{
          fontWeight: isSearch ? 'bold' : 'normal',
        }}
      >
        검색
      </button>
      <button
        onClick={handleClickWarehouse}
        style={{
          fontWeight: isWarehouse ? 'bold' : 'normal',
        }}
      >
        내 장비
      </button>
      <button
        onClick={handleClickBag}
        style={{
          fontWeight: isBag ? 'bold' : 'normal',
        }}
      >
        배낭
      </button>
      {/* <Button onClick={handleClickLogout}>로그아웃</Button> */}
    </div>
  );
};

export default Bottom;

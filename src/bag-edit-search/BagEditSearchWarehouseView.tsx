import { FC } from 'react';
import SearchWarehouseView from '../search-warehouse/component/SearchWarehouseView';
import { useNavigate, useParams } from 'react-router-dom';

const BagEditSearchWarehouseView: FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleClickBack = () => {
    navigate(`/bag/${id}/edit`, { replace: true });
  };

  return (
    <div
      style={{
        padding: '16px',
        overflowY: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '16px',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={handleClickBack}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 5L8 12L15 19"
              stroke="black"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div
          style={{
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '20px',
          }}
        >
          내 장비 추가
        </div>
      </div>
      <SearchWarehouseView />
    </div>
  );
};

export default BagEditSearchWarehouseView;

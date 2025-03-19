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
          alignItems: 'center',
        }}
        onClick={handleClickBack}
      >
        <svg
          width="30"
          height="30"
          viewBox="0 0 30 30"
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
      <SearchWarehouseView />
    </div>
  );
};

export default BagEditSearchWarehouseView;

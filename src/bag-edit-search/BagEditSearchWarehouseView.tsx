import { FC } from 'react';
import SearchWarehouseView from '../search-warehouse/component/SearchWarehouseView';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

const BagEditSearchWarehouseView: FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const handleClickBack = () => {
    if (location.state?.from === '/bag') {
      navigate(-1);
    } else {
      navigate(`/bag/${id}/edit`);
    }
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
      <SearchWarehouseView />
    </div>
  );
};

export default BagEditSearchWarehouseView;

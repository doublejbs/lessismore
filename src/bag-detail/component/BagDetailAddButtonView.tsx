import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import BagDetail from '../model/BagDetail';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailAddButtonView: FC<Props> = ({ bagDetail }) => {
  const navigate = useNavigate();

  const handleClickAdd = () => {
    navigate(`/bag/${bagDetail.getId()}/edit`, { state: { from: `/bag/${bagDetail.getId()}` } });
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        padding: '0.75rem 1.5rem',
        backgroundColor: 'white',
        zIndex: 10,
        maxWidth: '768px',
        margin: '0 auto',
      }}
    >
      <button
        style={{
          backgroundColor: 'black',
          width: '100%',
          padding: '0.875rem',
          color: 'white',
          borderRadius: '0.625rem',
        }}
        onClick={handleClickAdd}
      >
        장비 추가하기
      </button>
    </div>
  );
};

export default BagDetailAddButtonView;

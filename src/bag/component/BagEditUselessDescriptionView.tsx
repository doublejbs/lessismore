import { FC } from 'react';
import BagEdit from '../model/BagEdit';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

interface Props {
  bagEdit: BagEdit;
}

const BagEditUselessDescriptionView: FC<Props> = ({ bagEdit }) => {
  const navigate = useNavigate();
  const isUselessChecked = bagEdit.isUselessChecked();
  const usedWeight = bagEdit.getUsedWeight();

  const handleClickUseless = () => {
    navigate(`/bag/${bagEdit.getId()}/useless`, { state: { from: '/bag' } });
  };

  const render = () => {
    if (isUselessChecked) {
      return (
        <>
          <span>사용한 제품만 측정해보니</span>
          <div>
            <span
              style={{
                color: '#CCF124',
                fontSize: '20px',
                fontWeight: 'bold',
              }}
            >
              {usedWeight}kg
            </span>{' '}
            까지 줄어들어요
          </div>
        </>
      );
    } else {
      return (
        <>
          <span>사용 여부 기록하고</span>
          <span>무게 확인하기</span>
        </>
      );
    }
  };

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        padding: '0 1.25rem',
      }}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '0.5rem 0',
          fontSize: '0.875rem',
          fontWeight: 'bold',
        }}
        onClick={handleClickUseless}
      >
        {render()}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <svg
          width='1.5rem'
          height='1.5rem'
          viewBox='0 0 24 24'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path
            d='M10 7L15 12L10 17'
            stroke='black'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </div>
    </div>
  );
};

export default observer(BagEditUselessDescriptionView);

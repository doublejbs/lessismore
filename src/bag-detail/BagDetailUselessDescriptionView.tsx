import { FC } from 'react';
import BagDetail from './model/BagDetail';
import { observer } from 'mobx-react-lite';
import { useFlow } from '@stackflow/react/future';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailUselessDescriptionView: FC<Props> = ({ bagDetail }) => {
  const isUselessChecked = bagDetail.isUselessChecked();
  const usedWeight = bagDetail.getUsedWeight();
  const { push } = useFlow();

  const handleClickUseless = () => {
    bagDetail.goToUseless(push);
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
        padding: '1rem 1.25rem 0.5rem',
        backgroundColor: 'white',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          borderRadius: '0.375rem',
          transition: 'background-color 0.2s',
        }}
        onClick={handleClickUseless}
        onMouseEnter={(e) => {
          if (!('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
            e.currentTarget.style.backgroundColor = '#F9FAFB';
          }
        }}
        onMouseLeave={(e) => {
          if (!('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: '1.0625rem',
            fontWeight: 'bold',
          }}
        >
          {render()}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
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
    </div>
  );
};

export default observer(BagDetailUselessDescriptionView);

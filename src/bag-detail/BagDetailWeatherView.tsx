import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import BagDetail from './model/BagDetail';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailWeatherView: FC<Props> = ({ bagDetail }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/bag/${bagDetail.getId()}/weather`);
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
        onClick={handleClick}
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
          <span>날씨 확인하기</span>
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

export default BagDetailWeatherView;

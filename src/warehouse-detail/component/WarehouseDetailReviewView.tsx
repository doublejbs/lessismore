import { FC } from 'react';
import Gear from '../../model/Gear';

interface Props {
  gear: Gear;
}

const WarehouseDetailReviewView: FC<Props> = ({ gear }) => {
  const handleClickWriteReview = () => {
    // TODO: 리뷰 작성 로직 추가
    console.log('리뷰 작성하기');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        paddingTop: '24px',
      }}
    >
      <div>
        <span
          style={{
            fontWeight: 'bold',
            fontSize: '17px',
          }}
        >
          리뷰
        </span>
      </div>
      <div
        style={{
          padding: '14px 20px',
          backgroundColor: '#F3F3F3',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={handleClickWriteReview}
      >
        <span
          style={{
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          리뷰를 남겨보세요
        </span>
        <div>
          <svg
            width='24'
            height='25'
            viewBox='0 0 24 25'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <g clipPath='url(#clip0_390_5729)'>
              <path
                d='M8.58984 16.922L13.1698 12.332L8.58984 7.74203L9.99984 6.33203L15.9998 12.332L9.99984 18.332L8.58984 16.922Z'
                fill='#505967'
              />
            </g>
            <defs>
              <clipPath id='clip0_390_5729'>
                <rect width='24' height='24' fill='white' transform='translate(0 0.332031)' />
              </clipPath>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default WarehouseDetailReviewView;

import React, { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import BagDetailGearView from './BagDetailGearView';
import BagDetailFiltersView from './BagDetailFiltersView';
import BagDetail from './model/BagDetail';
import { FlipCounter } from '../bag-edit-add-gear/components/FlipCounter';
import BagDetailUselessDescriptionView from './BagDetailUselessDescriptionView';
import BagDetailChartView from './BagDetailChartView';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailView: FC<Props> = ({ bagDetail }) => {
  const navigate = useNavigate();
  const initialized = bagDetail.isInitialized();

  const handleClickAdd = () => {
    navigate(`/bag/${bagDetail.getId()}/edit`, { state: { from: `/bag/${bagDetail.getId()}` } });
  };

  const handleClickBack = () => {
    bagDetail.back();
  };

  useEffect(() => {
    bagDetail.initialize();
  }, []);

  if (initialized) {
    const name = bagDetail.getName();
    const weight = bagDetail.getWeight();
    const gears = bagDetail.getGears();
    const date = bagDetail.getDate();

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            width: '100%',
            backgroundColor: 'white',
            paddingTop: '0.5rem',
            gap: '0rem',
          }}
        >
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: '100%',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '1.25rem',
                lineHeight: '1.5rem',
              }}
            >
              {name}
            </div>
          </div>
          <div
            style={{
              width: '100%',
              textAlign: 'center',
              fontSize: '0.875rem',
              color: '#9B9B9B',
              paddingBottom: '0.5rem',
            }}
          >
            {date}
          </div>
        </div>
        <div
          style={{
            position: 'sticky',
            top: 0,
            width: '100%',
            backgroundColor: 'white',
            zIndex: 20,
            paddingTop: '0.25rem',
            paddingBottom: '0.25rem',
          }}
        >
          <div style={{ position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
              onClick={handleClickBack}
            >
              <svg
                width='1.25rem'
                height='1.25rem'
                viewBox='0 0 24 24'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path d='M15 5L8 12L15 19' stroke='black' strokeWidth='2' strokeLinejoin='round' />
              </svg>
            </div>
            <div
              style={{
                width: '100%',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '1.8rem',
              }}
            >
              <FlipCounter value={weight} />
            </div>
          </div>
        </div>
        <div style={{ height: '100%' }}>
          <BagDetailUselessDescriptionView bagDetail={bagDetail} />
          <div
            style={{
              width: '100%',
              backgroundColor: '#F2F4F6',
              height: '0.625rem',
            }}
          ></div>
          <BagDetailChartView bagDetail={bagDetail} />
          <div style={{ position: 'sticky', top: '3.5rem', zIndex: 19, backgroundColor: 'white' }}>
            <div
              style={{
                width: '100%',
                display: 'flex',
                padding: '0.9375rem 1.25rem',
                justifyContent: 'space-between',
                fontSize: '1.0625rem',
              }}
            >
              <span
                style={{
                  fontWeight: 'bold',
                }}
              >
                총 {gears.length}개의 장비
              </span>
            </div>
            <BagDetailFiltersView bagDetail={bagDetail} />
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              height: '100%',
              padding: '0 1.25rem 0',
            }}
          >
            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                gap: '16px',
                paddingBottom: '5rem',
              }}
            >
              {bagDetail.mapGears((gear) => {
                return <BagDetailGearView key={gear.getId()} gear={gear} bagDetail={bagDetail} />;
              })}
            </ul>
          </div>
        </div>
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            padding: '0.75rem 1.5rem',
            backgroundColor: 'white',
            zIndex: 30,
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
      </div>
    );
  }
};

export default observer(BagDetailView);

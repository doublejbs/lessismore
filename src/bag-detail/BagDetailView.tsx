import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import BagDetailGearView from './BagDetailGearView';
import BagDetailFiltersView from './BagDetailFiltersView';
import BagDetail from './model/BagDetail';
import { FlipCounter } from '../bag-edit-add-gear/components/FlipCounter';
import BagDetailUselessDescriptionView from './BagDetailUselessDescriptionView';
import BagDetailChartView from './BagDetailChartView';
import ShareButtonView from './component/ShareButtonView';

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
          overflowY: 'hidden',
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
            zIndex: 20,
            gap: '0rem',
          }}
        >
          <div style={{ position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                position: 'absolute',
                left: '1rem',
                top: '0.5rem',
              }}
              onClick={handleClickBack}
            >
              <svg
                width='1.5rem'
                height='1.5rem'
                viewBox='0 0 24 24'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path d='M15 5L8 12L15 19' stroke='black' strokeWidth='2' strokeLinejoin='round' />
              </svg>
            </div>
            <ShareButtonView bagId={bagDetail.getId()} bagName={name} />
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
              fontWeight: 'bold',
              fontSize: '2.5rem',
            }}
          >
            <FlipCounter value={weight} />
          </div>
          <div
            style={{
              width: '100%',
              textAlign: 'center',
              fontSize: '0.875rem',
              color: '#9B9B9B',
            }}
          >
            {date}
          </div>
        </div>
        <div style={{ overflowY: 'auto', height: '100%' }}>
          <BagDetailUselessDescriptionView bagDetail={bagDetail} />
          <div
            style={{
              width: '100%',
              backgroundColor: '#F2F4F6',
              height: '0.625rem',
            }}
          ></div>
          <BagDetailChartView bagDetail={bagDetail} />
          <div style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: 'white' }}>
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
                gap: '0.5rem',
                paddingBottom: '1rem',
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
            width: '100%',
            padding: '0.75rem 1.5rem',
          }}
        >
          <button
            style={{
              backgroundColor: 'black',
              width: '100%',
              padding: '1.125rem',
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

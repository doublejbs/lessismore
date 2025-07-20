import { FC, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import BagShare from '../model/BagShare';
import { FlipCounter } from '../../bag-edit-add-gear/components/FlipCounter';
import BagDetailChartView from '../../bag-detail/BagDetailChartView';
import BagDetailFiltersView from '../../bag-detail/BagDetailFiltersView';
import BagShareGearView from './BagShareGearView';

interface Props {
  bagShare: BagShare;
}

const BagShareView: FC<Props> = ({ bagShare }) => {
  const initialized = bagShare.isInitialized();

  useEffect(() => {
    bagShare.initialize();
  }, []);

  if (initialized) {
    const name = bagShare.getName();
    const weight = bagShare.getWeight();
    const gears = bagShare.getGears();
    const date = bagShare.getDateRange();

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
        <div style={{ height: '100%' }}>
          <BagDetailChartView bagDetail={bagShare} />
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
            <BagDetailFiltersView bagDetail={bagShare} />
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
              {bagShare.mapGears((gear) => {
                return <BagShareGearView key={gear.getId()} gear={gear} />;
              })}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // 로딩 상태
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      <div>로딩 중...</div>
    </div>
  );
};

export default observer(BagShareView);

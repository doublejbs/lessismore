import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import BagShare from '../model/BagShare';
import { FlipCounter } from '../../bag-edit-add-gear/components/FlipCounter';
import BagDetailChartView from '../../bag-detail/BagDetailChartView';
import BagDetailFiltersView from '../../bag-detail/BagDetailFiltersView';
import BagShareCategoryView from './BagShareCategoryView';
import { useScrollBasedFilterForBagShare } from '../../hooks/useScrollBasedFilterForBagShare';
import GearFilter from '../../warehouse/model/GearFilter';

interface Props {
  bagShare: BagShare;
}

const BagShareView: FC<Props> = ({ bagShare }) => {
  const initialized = bagShare.isInitialized();
  const { setCategoryRef, updateVisibility } = useScrollBasedFilterForBagShare(
    bagShare,
    initialized
  );
  const [observer, setObserver] = useState<IntersectionObserver | null>(null);

  useEffect(() => {
    bagShare.initialize();
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const newObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const categoryFilter = entry.target.getAttribute('data-category');
          if (categoryFilter) {
            updateVisibility(categoryFilter as GearFilter, entry.isIntersecting);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '-170px 0px 0px 0px',
      }
    );

    setObserver(newObserver);

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [initialized, updateVisibility]);

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
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                gap: '24px',
                paddingBottom: '5rem',
              }}
            >
              {bagShare.getGearsByCategory().map(({ category, gears }) => (
                <BagShareCategoryView
                  key={category.getFilter()}
                  category={category}
                  bagShare={bagShare}
                  setCategoryRef={setCategoryRef}
                  observer={observer}
                  gears={gears}
                />
              ))}
            </div>
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

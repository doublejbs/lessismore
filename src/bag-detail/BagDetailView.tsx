import { observer } from 'mobx-react-lite';
import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlipCounter } from '../bag-edit-add-gear/components/FlipCounter';
import { useScrollBasedFilter } from '../hooks/useScrollBasedFilter';
import GearFilter from '../warehouse/model/GearFilter';
import BagDetailCategoryView from './BagDetailCategoryView';
import BagDetailChartView from './BagDetailChartView';
import BagDetailDateView from './BagDetailDateView';
import BagDetailFiltersView from './BagDetailFiltersView';
import BagDetailNameView from './BagDetailNameView';
import BagDetailUselessDescriptionView from './BagDetailUselessDescriptionView';
import ShareButtonView from './component/ShareButtonView';
import BagDetail from './model/BagDetail';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailView: FC<Props> = ({ bagDetail }) => {
  const navigate = useNavigate();
  const initialized = bagDetail.isInitialized();
  const { setCategoryRef, updateVisibility } = useScrollBasedFilter(bagDetail, initialized);
  const [observer, setObserver] = useState<IntersectionObserver | null>(null);

  const handleClickAdd = () => {
    navigate(`/bag/${bagDetail.getId()}/edit`, { state: { from: `/bag/${bagDetail.getId()}` } });
  };

  const handleClickBack = () => {
    navigate(-1);
  };

  useEffect(() => {
    bagDetail.initialize();
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
    const weight = bagDetail.getWeight();
    const gears = bagDetail.getGears();

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
            <div
              style={{
                position: 'absolute',
                left: '0',
                top: '0.5rem',
                padding: '1rem',
              }}
              onClick={handleClickBack}
            >
              <svg
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M15.675 20.475C15.375 20.475 15.075 20.375 14.875 20.075L7.375 12.575C6.875 12.075 6.875 11.375 7.375 10.875L14.875 3.375C15.375 2.875 16.075 2.875 16.575 3.375C17.075 3.875 17.075 4.575 16.575 5.075L9.775 11.775L16.475 18.475C16.975 18.975 16.975 19.675 16.475 20.175C16.275 20.375 15.975 20.475 15.675 20.475Z'
                  fill='#191F28'
                />
              </svg>
            </div>
            <FlipCounter value={weight} />
            <ShareButtonView bagDetail={bagDetail} />
          </div>
        </div>
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
            <BagDetailNameView bagDetail={bagDetail} />
          </div>
          <BagDetailDateView bagDetail={bagDetail} />
        </div>

        <BagDetailUselessDescriptionView bagDetail={bagDetail} />
        <div
          style={{
            width: '100%',
            backgroundColor: '#F2F4F6',
            minHeight: '0.625rem',
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
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              gap: '24px',
              paddingBottom: '5rem',
            }}
          >
            {bagDetail.getGearsByCategory().map(({ category, gears }) => (
              <BagDetailCategoryView
                key={category.getFilter()}
                category={category}
                bagDetail={bagDetail}
                setCategoryRef={setCategoryRef}
                observer={observer}
                gears={gears}
              />
            ))}
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

import { observer } from 'mobx-react-lite';
import { FC, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlipCounter } from '../bag-edit-add-gear/components/FlipCounter';
import { useScrollBasedFilter } from '../hooks/useScrollBasedFilter';
import GearFilter from '../warehouse/model/GearFilter';
import BagDetailChartView from './BagDetailChartView';
import BagDetailFiltersView from './BagDetailFiltersView';
import BagDetailGearView from './BagDetailGearView';
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
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleClickAdd = () => {
    navigate(`/bag/${bagDetail.getId()}/edit`, { state: { from: `/bag/${bagDetail.getId()}` } });
  };

  useEffect(() => {
    bagDetail.initialize();
  }, []);

  useEffect(() => {
    if (!initialized) return;

    // IntersectionObserver 생성
    observerRef.current = new IntersectionObserver(
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

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [initialized, updateVisibility]);

  const setCategoryRefWithObserver = (categoryFilter: string, element: HTMLDivElement | null) => {
    setCategoryRef(categoryFilter, element);
    
    if (observerRef.current) {
      if (element) {
        observerRef.current.observe(element);
      }
    }
  };

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
          minHeight: '100vh',
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
            <ShareButtonView bagDetail={bagDetail} />
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
                <div 
                  key={category.getFilter()}
                  ref={(el) => setCategoryRefWithObserver(category.getFilter(), el)}
                  data-category={category.getFilter()}
                >
                  <div
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 'bold',
                      marginBottom: '12px',
                      color: '#333',
                      paddingBottom: '8px',
                    }}
                  >
                    {category.getName()}
                  </div>
                  <ul
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      width: '100%',
                      gap: '16px',
                    }}
                  >
                    {gears.map((gear) => (
                      <BagDetailGearView key={gear.getId()} gear={gear} bagDetail={bagDetail} />
                    ))}
                  </ul>
                </div>
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

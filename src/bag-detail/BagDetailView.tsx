import { observer } from 'mobx-react-lite';
import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlipCounter } from '../bag-edit-add-gear/components/FlipCounter';
import BagDetailChartView from './BagDetailChartView';
import BagDetailGearView from './BagDetailGearView';
import BagDetailUselessDescriptionView from './BagDetailUselessDescriptionView';
import ShareButtonView from './component/ShareButtonView';
import BagDetail from './model/BagDetail';
import BagDetailFiltersView from './BagDetailFiltersView';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailView: FC<Props> = ({ bagDetail }) => {
  const navigate = useNavigate();
  const initialized = bagDetail.isInitialized();

  const handleClickAdd = () => {
    navigate(`/bag/${bagDetail.getId()}/edit`, { state: { from: `/bag/${bagDetail.getId()}` } });
  };

  useEffect(() => {
    bagDetail.initialize();
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let maxRatio = 0;
        let activeCategory = '';

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            const categoryId = entry.target.id;
            activeCategory = categoryId.replace('category-', '');
          }
        });

        if (activeCategory) {
          bagDetail.setActiveCategory(activeCategory);
        }
      },
      {
        root: null,
        rootMargin: '-100px 0px -60% 0px',
        threshold: [0, 0.1, 0.5, 1.0],
      }
    );

    // 모든 카테고리 섹션을 관찰
    const gearsByCategory = bagDetail.getGearsByCategory();
    gearsByCategory.forEach(({ category }) => {
      const element = document.getElementById(`category-${category}`);
      if (element) {
        observer.observe(element);
      }
    });

    // 첫 번째 카테고리를 기본 활성 카테고리로 설정
    if (gearsByCategory.length > 0) {
      bagDetail.setActiveCategory(gearsByCategory[0].category);
    }

    return () => {
      observer.disconnect();
    };
  }, [initialized, bagDetail]);

  if (initialized) {
    const name = bagDetail.getName();
    const weight = bagDetail.getWeight();
    const gears = bagDetail.getAllGears();
    const gearsByCategory = bagDetail.getGearsByCategory();
    const date = bagDetail.getDate();

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflowY: 'auto',
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
            padding: '0 1.25rem 0px',
          }}
        >
          {gearsByCategory.map(({ category, gears: categoryGears }) => (
            <div
              key={category}
              id={`category-${category}`}
              style={{
                width: '100%',
                marginBottom: '2rem',
              }}
            >
              <div
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 'bold',
                  marginBottom: '1rem',
                  padding: '0.5rem 0',
                }}
              >
                {category} ({categoryGears.length})
              </div>
              <ul
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  gap: '16px',
                }}
              >
                {categoryGears.map((gear) => (
                  <BagDetailGearView key={gear.getId()} gear={gear} bagDetail={bagDetail} />
                ))}
              </ul>
            </div>
          ))}
          <div style={{ height: '76px' }} />
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

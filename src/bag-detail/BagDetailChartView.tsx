import { FC, useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import BagDetail from './model/BagDetail';
import GearFilter from '../warehouse/model/GearFilter';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailChartView: FC<Props> = ({ bagDetail }) => {
  const [isAnimated, setIsAnimated] = useState(false);
  const [isPercentMode, setIsPercentMode] = useState(true);

  // 애니메이션 시작
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimated(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // GearFilter를 한국어로 변환
  const getKoreanCategoryName = (category: string): string => {
    switch (category) {
      case GearFilter.Tent:
        return '텐트';
      case GearFilter.SleepingBag:
        return '침낭';
      case GearFilter.Backpack:
        return '배낭';
      case GearFilter.Clothing:
        return '의류';
      case GearFilter.Mat:
        return '매트';
      case GearFilter.Furniture:
        return '가구';
      case GearFilter.Lantern:
        return '랜턴';
      case GearFilter.Cooking:
        return '조리';
      case GearFilter.Etc:
        return '기타';
      case '베이스':
        return '베이스';
      default:
        return category;
    }
  };

  // 카테고리별 데이터 계산
  const getCategoryData = () => {
    const gears = bagDetail.getGears();
    const categoryMap = new Map<string, { count: number; weight: number }>();
    let totalWeight = 0;

    gears.forEach((gear) => {
      const gearFilterCategory = gear.getCategory() || GearFilter.Etc;
      const weight = Number(gear.getWeight());

      // 텐트, 침낭, 매트, 배낭을 베이스로 분류
      let category = gearFilterCategory;
      if (
        gearFilterCategory === GearFilter.Tent ||
        gearFilterCategory === GearFilter.SleepingBag ||
        gearFilterCategory === GearFilter.Mat ||
        gearFilterCategory === GearFilter.Backpack
      ) {
        category = '베이스(배낭, 텐트, 침낭, 매트)';
      }

      if (!categoryMap.has(category)) {
        categoryMap.set(category, { count: 0, weight: 0 });
      }
      const data = categoryMap.get(category)!;
      data.count += 1;
      data.weight += weight;
      totalWeight += weight;
    });

    // 카테고리 순서 정의
    const categoryOrder = [
      '베이스(배낭, 텐트, 침낭, 매트)',
      GearFilter.Lantern,
      GearFilter.Cooking,
      GearFilter.Clothing,
      GearFilter.Furniture,
      GearFilter.Etc,
    ];

    // 순서에 따라 정렬된 데이터 생성
    const sortedData = categoryOrder
      .map((category) => {
        const data = categoryMap.get(category);
        if (data) {
          return {
            category,
            count: data.count,
            weight: data.weight,
            percentage: totalWeight > 0 ? (data.weight / totalWeight) * 100 : 0,
          };
        }
        return null;
      })
      .filter((item) => item !== null);

    return sortedData;
  };

  const categoryData = getCategoryData();
  const hasData = categoryData.length > 0;

  // 카테고리별 색상 정의
  const getColorForCategory = (index: number) => {
    const colors = [
      '#4A90E2',
      '#50C878',
      '#FFD700',
      '#FF6B6B',
      '#9B59B6',
      '#FF8C00',
      '#20B2AA',
      '#FF69B4',
    ];
    return colors[index % colors.length];
  };

  return (
    <div
      style={{
        padding: '1.25rem',
        backgroundColor: 'white',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <div
          style={{
            fontSize: '1.0625rem',
            fontWeight: 'bold',
          }}
        >
          카테고리별 무게
        </div>
        {hasData && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <button
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                border: '1px solid black',
                borderRadius: '0.375rem',
                backgroundColor: 'black',
                color: 'white',
                cursor: 'pointer',
              }}
              onClick={() => setIsPercentMode(!isPercentMode)}
            >
              {isPercentMode ? '무게' : '퍼센트'} 보기
            </button>
          </div>
        )}
      </div>

      {hasData ? (
        // 스택 바 차트
        <div
          style={{
            height: '3rem',
            backgroundColor: '#F2F4F6',
            borderRadius: '0.5rem',
            display: 'flex',
          }}
        >
          {categoryData.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === categoryData.length - 1;
            const minWidthPercent = 12; // 최소 넓이 12%
            const displayWidth = Math.max(item.percentage, minWidthPercent);

            return (
              <div
                key={index}
                style={{
                  width: isAnimated ? `${displayWidth}%` : '0%',
                  backgroundColor: getColorForCategory(index),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  color: 'white',
                  fontWeight: 'bold',
                  borderTopLeftRadius: isFirst ? '0.5rem' : '0',
                  borderBottomLeftRadius: isFirst ? '0.5rem' : '0',
                  borderTopRightRadius: isLast ? '0.5rem' : '0',
                  borderBottomRightRadius: isLast ? '0.5rem' : '0',
                  transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden',
                  minWidth: '60px', // 최소 픽셀 넓이
                }}
              >
                {isAnimated && (
                  <div
                    style={{
                      textAlign: 'center',
                      lineHeight: '1.1',
                      opacity: isAnimated ? 1 : 0,
                      transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '0.625rem', fontWeight: 'bold' }}>
                      {getKoreanCategoryName(item.category)}
                    </div>
                    <div style={{ fontSize: '0.75rem' }}>
                      {isPercentMode
                        ? `${item.percentage.toFixed(1)}%`
                        : `${item.weight.toFixed(0)}g`}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // 데이터가 없을 때 메시지
        <div
          style={{
            height: '3rem',
            backgroundColor: '#F2F4F6',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem',
            color: '#6B7280',
            fontWeight: '500',
          }}
        >
          장비를 추가해주세요
        </div>
      )}
    </div>
  );
};

export default observer(BagDetailChartView);

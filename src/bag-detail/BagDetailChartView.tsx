import { observer } from 'mobx-react-lite';
import { FC, useEffect, useState } from 'react';
import Gear from '../model/Gear';
import { getKoreanCategoryName } from '../utils/CategoryUtils';
import GearFilter from '../warehouse/model/GearFilter';

interface Bag {
  getGears: () => Gear[];
}

interface Props {
  bagDetail: Bag;
}

const BagDetailChartView: FC<Props> = ({ bagDetail }) => {
  const [isAnimated, setIsAnimated] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // 애니메이션 시작
  useEffect(() => {
    // 브라우저가 초기 렌더링을 완료한 후 애니메이션 시작
    // requestAnimationFrame을 두 번 사용하여 확실히 초기 렌더링 완료 후 실행
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsAnimated(true);
      });
    });
  }, []);

  // 카테고리별 데이터 계산
  const getCategoryData = () => {
    const gears = bagDetail.getGears();
    const categoryMap = new Map<string, { count: number; weight: number }>();
    let totalWeight = 0;

    gears.forEach((gear) => {
      // 세분 카테고리(`bottle` 등)를 1차 그룹으로 접는다 — 원본 값을 그대로 쓰면
      // 차트에 그룹이 아닌 세분 키가 따로 잡힌다(Gear.getGroupCategory 주석 참고).
      const gearFilterCategory = gear.getGroupCategory();
      const weight = Number(gear.getWeight());

      // 텐트, 침낭, 매트, 배낭을 베이스로 분류.
      // 아래에서 그룹이 아닌 묶음 라벨('베이스…')로도 덮어쓰므로 타입은 string이다.
      let category: string = gearFilterCategory;
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

    // 모든 카테고리 데이터 생성 후 퍼센트 내림차순 정렬
    const sortedData = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        weight: data.weight,
        percentage: totalWeight > 0 ? (data.weight / totalWeight) * 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);

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
        padding: '0.5rem 1.25rem 1rem',
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
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div
          style={{
            fontSize: '1.0625rem',
            fontWeight: 'bold',
          }}
        >
          📊 카테고리별 무게
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
              d={isExpanded ? 'M7 10L12 15L17 10' : 'M10 7L15 12L10 17'}
              stroke='black'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <>
          {hasData ? (
            <>
              {/* 스택 바 차트 */}
              <div
                style={{
                  height: '3rem',
                  backgroundColor: '#F2F4F6',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  margin: '1rem 0',
                }}
              >
                {categoryData.map((item, index) => {
                  const isFirst = index === 0;
                  const isLast = index === categoryData.length - 1;
                  const isHighlighted = highlightedIndex === index;
                  // 애니메이션을 위해 실제 퍼센트 사용 (최소 너비는 픽셀로만 제한)
                  const displayWidth = item.percentage;

                  return (
                    <div
                      key={index}
                      style={{
                        width: isAnimated ? `${displayWidth}%` : '0%',
                        backgroundColor: getColorForCategory(index),
                        borderTopLeftRadius: isFirst ? '0.5rem' : '0',
                        borderBottomLeftRadius: isFirst ? '0.5rem' : '0',
                        borderTopRightRadius: isLast ? '0.5rem' : '0',
                        borderBottomRightRadius: isLast ? '0.5rem' : '0',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        minWidth: isAnimated ? '4px' : '0px',
                        cursor: 'pointer',
                        transform: isHighlighted ? 'scaleY(1.15)' : 'scaleY(1)',
                        transformOrigin: 'center',
                        zIndex: isHighlighted ? 10 : 1,
                        position: 'relative',
                      }}
                      onClick={() => {
                        setHighlightedIndex(highlightedIndex === index ? null : index);
                      }}
                    />
                  );
                })}
              </div>

              {/* 범례 */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                {categoryData.map((item, index) => {
                  const isDimmed = highlightedIndex !== null && highlightedIndex !== index;

                  return (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        opacity: isAnimated ? (isDimmed ? 0.4 : 1) : 0,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setHighlightedIndex(highlightedIndex === index ? null : index);
                      }}
                    >
                      {/* 왼쪽: 색상 표시자 + 카테고리 이름과 퍼센트 */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: getColorForCategory(index),
                            borderRadius: '2px',
                            flexShrink: 0,
                          }}
                        />
                        <div
                          style={{
                            fontSize: '0.875rem',
                            color: '#374151',
                            lineHeight: '1.2',
                          }}
                        >
                          <div style={{ fontWeight: 'bold' }}>
                            {getKoreanCategoryName(item.category)}
                          </div>
                          <div style={{ color: '#6B7280' }}>{item.percentage.toFixed(1)}%</div>
                        </div>
                      </div>

                      {/* 오른쪽: 무게 */}
                      <div
                        style={{
                          fontSize: '0.875rem',
                          color: '#374151',
                          fontWeight: 'bold',
                          textAlign: 'right',
                        }}
                      >
                        {item.weight.toFixed(0)}g
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
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
        </>
      )}
    </div>
  );
};

export default observer(BagDetailChartView);

import { FC } from 'react';

interface Props {
  count?: number; // 스켈레톤 아이템 개수
}

const SearchSkeletonView: FC<Props> = ({ count = 5 }) => {
  const renderSkeletonItem = (index: number) => {
    return (
      <li
        key={index}
        style={{
          display: 'flex',
          padding: '10px 0px',
          gap: '12px',
        }}
      >
        {/* 이미지 영역 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '6px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              backgroundColor: '#F1F1F1',
              display: 'flex',
              alignItems: 'center',
              minWidth: '80px',
              borderRadius: '4px',
              justifyContent: 'center',
              overflow: 'hidden',
              animation: 'skeleton-shimmer 1.5s infinite ease-in-out',
            }}
          />
        </div>

        {/* 텍스트 정보 영역 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flexGrow: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              fontSize: '12px',
              gap: '10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                width: '100%',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '7px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    gap: '7px',
                    lineHeight: '1',
                  }}
                >
                  {/* 회사명 */}
                  <div
                    style={{
                      height: '10px',
                      width: '60px',
                      backgroundColor: '#E0E0E0',
                      borderRadius: '2px',
                      animation: 'skeleton-shimmer 1.5s infinite ease-in-out',
                    }}
                  />

                  {/* 제품명 */}
                  <div
                    style={{
                      height: '14px',
                      width: '120px',
                      backgroundColor: '#E0E0E0',
                      borderRadius: '2px',
                      animation: 'skeleton-shimmer 1.5s infinite ease-in-out',
                    }}
                  />

                  {/* 컬러 */}
                  <div
                    style={{
                      height: '14px',
                      width: '80px',
                      backgroundColor: '#E0E0E0',
                      borderRadius: '2px',
                      animation: 'skeleton-shimmer 1.5s infinite ease-in-out',
                    }}
                  />
                </div>

                {/* 무게 */}
                <div
                  style={{
                    height: '14px',
                    width: '50px',
                    backgroundColor: '#E0E0E0',
                    borderRadius: '2px',
                    animation: 'skeleton-shimmer 1.5s infinite ease-in-out',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 체크박스 영역 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: '40px',
            height: '80px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                backgroundColor: '#E0E0E0',
                borderRadius: '4px',
                animation: 'skeleton-shimmer 1.5s infinite ease-in-out',
              }}
            />
          </div>
        </div>
      </li>
    );
  };

  return (
    <>
      <style>
        {`
          @keyframes skeleton-shimmer {
            0% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
            100% {
              opacity: 1;
            }
          }
        `}
      </style>
      <ul
        style={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {Array.from({ length: count }, (_, index) => renderSkeletonItem(index))}
      </ul>
    </>
  );
};

export default SearchSkeletonView;

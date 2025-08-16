import { FC } from 'react';

interface Props {}

const BagDetailSkeletonView: FC<Props> = () => {
  const renderGearSkeletonItem = (index: number) => {
    return (
      <div
        key={index}
        style={{
          display: 'flex',
          padding: '12px 0px',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        {/* 장비 이미지 */}
        <div
          style={{
            width: '60px',
            height: '60px',
            backgroundColor: '#E5E7EB',
            borderRadius: '8px',
            minWidth: '60px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />

        {/* 장비 정보 */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div
            style={{
              width: '70%',
              height: '16px',
              backgroundColor: '#E5E7EB',
              borderRadius: '4px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
          <div
            style={{
              width: '50%',
              height: '14px',
              backgroundColor: '#E5E7EB',
              borderRadius: '4px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        </div>

        {/* 무게 */}
        <div
          style={{
            width: '50px',
            height: '16px',
            backgroundColor: '#E5E7EB',
            borderRadius: '4px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
      </div>
    );
  };

  const renderCategorySkeleton = (index: number) => {
    return (
      <div key={index} style={{ marginBottom: '24px' }}>
        {/* 카테고리 제목 */}
        <div
          style={{
            width: '120px',
            height: '18px',
            backgroundColor: '#E5E7EB',
            borderRadius: '4px',
            marginBottom: '12px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />

        {/* 카테고리 내 장비들 */}
        {Array.from({ length: 3 }, (_, itemIndex) => renderGearSkeletonItem(itemIndex))}
      </div>
    );
  };

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}
      </style>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          backgroundColor: 'white',
        }}
      >
        {/* 상단 헤더 영역 */}
        <div
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            height: '3.5rem',
            backgroundColor: 'white',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1rem',
            borderBottom: '1px solid #F3F4F6',
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              backgroundColor: '#E5E7EB',
              borderRadius: '4px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
          <div
            style={{
              display: 'flex',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '24px',
                backgroundColor: '#E5E7EB',
                borderRadius: '4px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
            <div
              style={{
                width: '24px',
                height: '24px',
                backgroundColor: '#E5E7EB',
                borderRadius: '4px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div style={{ marginTop: '3.5rem', flex: 1 }}>
          {/* 가방 정보 영역 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'white',
              padding: '1rem 1.25rem',
              gap: '12px',
            }}
          >
            {/* 가방 이름 */}
            <div
              style={{
                width: '80%',
                height: '24px',
                backgroundColor: '#E5E7EB',
                borderRadius: '4px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />

            {/* 날짜 */}
            <div
              style={{
                width: '60%',
                height: '18px',
                backgroundColor: '#E5E7EB',
                borderRadius: '4px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
          </div>

          {/* 설명 영역 */}
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'white',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '16px',
                backgroundColor: '#E5E7EB',
                borderRadius: '4px',
                marginBottom: '8px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
            <div
              style={{
                width: '70%',
                height: '16px',
                backgroundColor: '#E5E7EB',
                borderRadius: '4px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
          </div>

          {/* 필터 영역 */}
          <div
            style={{
              position: 'sticky',
              top: '3.5rem',
              zIndex: 19,
              backgroundColor: 'white',
              padding: '0.9375rem 1.25rem',
              borderBottom: '1px solid #F3F4F6',
            }}
          >
            {/* 총 개수 */}
            <div
              style={{
                width: '120px',
                height: '18px',
                backgroundColor: '#E5E7EB',
                borderRadius: '4px',
                marginBottom: '12px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />

            {/* 필터 버튼들 */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
              }}
            >
              {Array.from({ length: 5 }, (_, index) => (
                <div
                  key={index}
                  style={{
                    width: '80px',
                    height: '32px',
                    backgroundColor: '#E5E7EB',
                    borderRadius: '16px',
                    minWidth: '80px',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  }}
                />
              ))}
            </div>
          </div>

          {/* 장비 리스트 영역 */}
          <div
            style={{
              padding: '1rem 1.25rem',
              paddingBottom: '6rem',
            }}
          >
            {Array.from({ length: 4 }, (_, index) => renderCategorySkeleton(index))}
          </div>
        </div>
      </div>
    </>
  );
};

export default BagDetailSkeletonView;

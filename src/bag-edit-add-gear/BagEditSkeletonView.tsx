import { FC } from 'react';

interface Props {}

const BagEditSkeletonView: FC<Props> = () => {
  const renderGearSkeletonItem = (index: number) => {
    return (
      <li
        key={index}
        style={{
          display: 'flex',
          padding: '10px 0px',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        {/* 장비 이미지 */}
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
              backgroundColor: '#E5E7EB',
              display: 'flex',
              alignItems: 'center',
              minWidth: '80px',
              borderRadius: '4px',
              justifyContent: 'center',
              overflow: 'hidden',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        </div>

        {/* 장비 정보 */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'flex-start',
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
                backgroundColor: '#E5E7EB',
                borderRadius: '2px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />

            {/* 제품명 */}
            <div
              style={{
                height: '14px',
                width: '120px',
                backgroundColor: '#E5E7EB',
                borderRadius: '2px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />

            {/* 컬러 */}
            <div
              style={{
                height: '14px',
                width: '80px',
                backgroundColor: '#E5E7EB',
                borderRadius: '2px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
          </div>

          {/* 무게 */}
          <div
            style={{
              height: '14px',
              width: '50px',
              backgroundColor: '#E5E7EB',
              borderRadius: '2px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
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
                backgroundColor: '#E5E7EB',
                borderRadius: '4px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
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
        {/* 상단 고정 헤더 */}
        <div
          style={{
            position: 'fixed',
            width: '100%',
            display: 'flex',
            left: 0,
            top: 0,
            zIndex: 10,
            padding: '0.5rem',
            backgroundColor: 'white',
            flexDirection: 'column',
            minHeight: '204px',
          }}
        >
          {/* 뒤로가기 버튼 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
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
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '19px',
              marginTop: '10px',
            }}
          >
            {/* FlipCounter 영역 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '60px',
              }}
            >
              <div
                style={{
                  width: '200px',
                  height: '50px',
                  backgroundColor: '#E5E7EB',
                  borderRadius: '8px',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              />
            </div>

            {/* 내 장비 제목과 추가 버튼 */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0 12px',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '24px',
                  backgroundColor: '#E5E7EB',
                  borderRadius: '4px',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              />
              <div
                style={{
                  width: '100px',
                  height: '40px',
                  backgroundColor: '#E5E7EB',
                  borderRadius: '26px',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              />
            </div>

            {/* 필터 버튼들 */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                padding: '0 12px',
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
        </div>

        {/* 메인 콘텐츠 */}
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {/* 상단 헤더 공간 */}
          <div
            style={{
              width: '100%',
              minHeight: '204px',
            }}
          />

          {/* 장비 리스트 */}
          <ul
            style={{
              padding: '0 20px',
              paddingBottom: '100px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {Array.from({ length: 8 }, (_, index) => renderGearSkeletonItem(index))}
          </ul>

          {/* 하단 버튼 공간 */}
          <div
            style={{
              minHeight: '72px',
            }}
          />
        </div>

        {/* 하단 고정 버튼 */}
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100%',
            padding: '12px 20px',
            backgroundColor: 'white',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: '#E5E7EB',
              borderRadius: '10px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        </div>
      </div>
    </>
  );
};

export default BagEditSkeletonView;

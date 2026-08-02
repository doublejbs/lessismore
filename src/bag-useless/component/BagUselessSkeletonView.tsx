import { FC } from 'react';

interface Props {}

const BagUselessSkeletonView: FC<Props> = () => {
  const renderGearSkeletonItem = (index: number) => {
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
              backgroundColor: '#E5E7EB',
              borderRadius: '4px',
              minWidth: '80px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        </div>

        {/* 장비 정보 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flex: 1,
            gap: '6px',
          }}
        >
          <div
            style={{
              width: '70%',
              height: '18px',
              backgroundColor: '#E5E7EB',
              borderRadius: '4px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
          <div
            style={{
              width: '50%',
              height: '16px',
              backgroundColor: '#E5E7EB',
              borderRadius: '4px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
          <div
            style={{
              width: '40%',
              height: '16px',
              backgroundColor: '#E5E7EB',
              borderRadius: '4px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        </div>

        {/* 체크박스 영역 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: '24px',
            height: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              width: '24px',
              height: '24px',
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
          overflowY: 'hidden',
          height: '100%',
          padding: '0 20px',
          gap: '12px',
        }}
      >
        {/* 상단 뒤로가기 버튼 */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            padding: '7px 0',
          }}
        >
          <div
            style={{
              width: '25px',
              height: '24px',
              backgroundColor: '#E5E7EB',
              borderRadius: '4px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        </div>

        {/* 제목 영역 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: '28px',
            fontWeight: 'bold',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '90%',
              height: '34px',
              backgroundColor: '#E5E7EB',
              borderRadius: '4px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
          <div
            style={{
              width: '60%',
              height: '34px',
              backgroundColor: '#E5E7EB',
              borderRadius: '4px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        </div>

        {/* 메인 컨텐츠 영역 */}
        <div
          style={{
            display: 'flex',
            paddingTop: '24px',
            flexDirection: 'column',
            height: '100%',
            overflowY: 'auto',
          }}
        >
          {/* 상태 표시 및 전체 선택 버튼 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '16px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                width: '150px',
                height: '20px',
                backgroundColor: '#E5E7EB',
                borderRadius: '4px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
            <div
              style={{
                width: '80px',
                height: '20px',
                backgroundColor: '#E5E7EB',
                borderRadius: '4px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
          </div>

          {/* 장비 리스트 */}
          <ul
            style={{
              height: '100%',
              overflowY: 'auto',
            }}
          >
            {Array.from({ length: 8 }, (_, index) => renderGearSkeletonItem(index))}
          </ul>

          {/* 완료 버튼 */}
          <div
            style={{
              width: '100%',
              padding: '12px 0',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '54px',
                backgroundColor: '#E5E7EB',
                borderRadius: '10px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default BagUselessSkeletonView;

import React, { FC } from 'react';

interface Props {
  isWebView?: boolean;
}

const WarehouseDetailSkeletonView: FC<Props> = ({ isWebView = false }) => {
  return (
    <>
      {!isWebView && (
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '7px 20px',
            position: 'fixed',
          }}
        >
          <div
            style={{
              width: '25px',
              height: '24px',
              backgroundColor: '#E5E7EB',
              borderRadius: '4px',
            }}
          />
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '0 20px',
          marginTop: '46px',
          paddingBottom: '100px',
        }}
      >
        {/* 기어 이미지 스켈레톤 */}
        <div
          style={{
            width: '100%',
            height: '200px',
            backgroundColor: '#E5E7EB',
            borderRadius: '8px',
            marginBottom: '16px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />

        {/* 기어 정보 스켈레톤 */}
        <div style={{ marginBottom: '24px' }}>
          {/* 제목 */}
          <div
            style={{
              width: '80%',
              height: '24px',
              backgroundColor: '#E5E7EB',
              borderRadius: '4px',
              marginBottom: '12px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />

          {/* 설명 라인들 */}
          <div
            style={{
              width: '60%',
              height: '16px',
              backgroundColor: '#E5E7EB',
              borderRadius: '4px',
              marginBottom: '8px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
          <div
            style={{
              width: '40%',
              height: '16px',
              backgroundColor: '#E5E7EB',
              borderRadius: '4px',
              marginBottom: '8px',
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
        </div>

        {/* 백 기록 섹션 스켈레톤 */}
        <div>
          <div
            style={{
              width: '30%',
              height: '20px',
              backgroundColor: '#E5E7EB',
              borderRadius: '4px',
              marginBottom: '16px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />

          {/* 백 리스트 아이템들 */}
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '12px',
                padding: '12px',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#E5E7EB',
                  borderRadius: '6px',
                  marginRight: '12px',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    width: '70%',
                    height: '16px',
                    backgroundColor: '#E5E7EB',
                    borderRadius: '4px',
                    marginBottom: '6px',
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
            </div>
          ))}
        </div>

        {/* 하단 버튼들 스켈레톤 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '16px',
            position: 'fixed',
            bottom: 0,
            width: '100%',
            left: 0,
            padding: '12px 24px',
            backgroundColor: 'white',
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

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  );
};

export default WarehouseDetailSkeletonView;

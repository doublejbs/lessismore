import React from 'react';

const FlexLayoutExample: React.FC = () => {
  return (
    <div>
      {/* 방법 1: 빈 요소 추가 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px',
          border: '1px solid #ccc',
          marginBottom: '20px',
        }}
      >
        <div style={{ background: '#ff6b6b', padding: '10px', color: 'white' }}>첫 번째 (왼쪽)</div>
        <div style={{ background: '#4ecdc4', padding: '10px', color: 'white' }}>
          두 번째 (가운데)
        </div>
        <div style={{ width: '0' }}></div> {/* 빈 요소로 균형 맞춤 */}
      </div>

      {/* 방법 2: margin auto 사용 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '20px',
          border: '1px solid #ccc',
          marginBottom: '20px',
        }}
      >
        <div style={{ background: '#ff6b6b', padding: '10px', color: 'white' }}>첫 번째 (왼쪽)</div>
        <div
          style={{
            background: '#4ecdc4',
            padding: '10px',
            color: 'white',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          두 번째 (가운데)
        </div>
      </div>

      {/* 방법 3: absolute positioning */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '20px',
          border: '1px solid #ccc',
          marginBottom: '20px',
          position: 'relative',
        }}
      >
        <div style={{ background: '#ff6b6b', padding: '10px', color: 'white' }}>첫 번째 (왼쪽)</div>
        <div
          style={{
            background: '#4ecdc4',
            padding: '10px',
            color: 'white',
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          두 번째 (가운데)
        </div>
      </div>

      {/* 방법 4: flex-grow 사용 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '20px',
          border: '1px solid #ccc',
          marginBottom: '20px',
        }}
      >
        <div style={{ background: '#ff6b6b', padding: '10px', color: 'white' }}>첫 번째 (왼쪽)</div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div
            style={{
              background: '#4ecdc4',
              padding: '10px',
              color: 'white',
              display: 'inline-block',
            }}
          >
            두 번째 (가운데)
          </div>
        </div>
      </div>

      {/* 방법 5: CSS Grid 대안 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center',
          padding: '20px',
          border: '1px solid #ccc',
          marginBottom: '20px',
        }}
      >
        <div style={{ background: '#ff6b6b', padding: '10px', color: 'white' }}>첫 번째 (왼쪽)</div>
        <div
          style={{
            background: '#4ecdc4',
            padding: '10px',
            color: 'white',
            justifySelf: 'center',
          }}
        >
          두 번째 (가운데)
        </div>
        <div></div> {/* 빈 그리드 셀 */}
      </div>
    </div>
  );
};

export default FlexLayoutExample;

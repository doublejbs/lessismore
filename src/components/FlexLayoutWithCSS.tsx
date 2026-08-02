import React from 'react';
import '../styles/FlexLayout.css';

const FlexLayoutWithCSS: React.FC = () => {
  return (
    <div>
      {/* 방법 1: 빈 요소 추가 */}
      <div className='container flex-container-method1'>
        <div className='item item-left'>첫 번째 (왼쪽)</div>
        <div className='item item-center'>두 번째 (가운데)</div>
        <div className='spacer'></div>
      </div>

      {/* 방법 2: margin auto 사용 */}
      <div className='container flex-container-method2'>
        <div className='item item-left'>첫 번째 (왼쪽)</div>
        <div className='item item-center center-item'>두 번째 (가운데)</div>
      </div>

      {/* 방법 3: absolute positioning */}
      <div className='container flex-container-method3'>
        <div className='item item-left'>첫 번째 (왼쪽)</div>
        <div className='item item-center absolute-center'>두 번째 (가운데)</div>
      </div>

      {/* 방법 4: flex-grow 사용 */}
      <div className='container flex-container-method4'>
        <div className='item item-left'>첫 번째 (왼쪽)</div>
        <div className='flex-center'>
          <div className='item item-center'>두 번째 (가운데)</div>
        </div>
      </div>

      {/* 방법 5: CSS Grid 대안 */}
      <div className='container grid-container'>
        <div className='item item-left'>첫 번째 (왼쪽)</div>
        <div className='item item-center grid-center'>두 번째 (가운데)</div>
        <div></div>
      </div>
    </div>
  );
};

export default FlexLayoutWithCSS;

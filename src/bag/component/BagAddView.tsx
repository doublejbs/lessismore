import React, { FC, useState } from 'react';
import Bag from '../model/Bag';
import { useNavigate } from 'react-router-dom';

interface Props {
  bag: Bag;
}

const BagAddView: FC<Props> = ({ bag }) => {
  const [shouldShowAdd, setShouldShowAdd] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const navigate = useNavigate();

  const showAdd = () => {
    setShouldShowAdd(true);
  };

  const handleChange = (e: any) => {
    setInputValue(e.target.value);
  };

  const handleClickConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const bagID = await bag.add(inputValue);

    if (bagID) {
      setInputValue('');
      setShouldShowAdd(false);
      navigate(`/bag/${bagID}`);
    }
  };

  const handleClickCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue('');
    setShouldShowAdd(false);
  };

  return (
    <>
      <button
        style={{
          position: 'fixed',
          right: '20px',
          bottom: '80px',
          borderRadius: '32px',
          border: '1px solid black',
          height: '48px',
          background: 'black',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          overflow: 'hidden',
          color: 'white',
          padding: '12px 16px',
          width: '127px',
        }}
        onClick={showAdd}
      >
        <div>
          <svg
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <g clipPath='url(#clip0_491_9402)'>
              <path d='M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z' fill='white' />
            </g>
            <defs>
              <clipPath id='clip0_491_9402'>
                <rect width='24' height='24' fill='white' />
              </clipPath>
            </defs>
          </svg>
        </div>
        <div style={{ fontSize: '16px' }}>배낭 추가</div>
      </button>
      {shouldShowAdd && (
        <div
          style={{
            position: 'fixed',
            width: '100%',
            height: '100%',
            top: 0,
            left: 0,
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'end',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          }}
          onClick={handleClickCancel}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              backgroundColor: 'white',
              borderRadius: '8px 8px 0 0',
              padding: '16px',
            }}
          >
            <div
              style={{
                fontWeight: 'bold',
                fontSize: '20px',
              }}
            >
              배낭 이름
            </div>
            <div>
              <input
                style={{
                  borderRadius: '10px',
                  backgroundColor: '#EEEEEE',
                  border: 'none',
                  width: '100%',
                }}
                placeholder={'배낭 이름을 입력해주세요'}
                value={inputValue}
                onChange={handleChange}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '8px',
              }}
            >
              <button
                style={{
                  width: '100%',
                  backgroundColor: '#EEEEEE',
                  borderRadius: '10px',
                  padding: '12px 0',
                }}
                onClick={handleClickCancel}
              >
                취소
              </button>
              <button
                style={{
                  width: '100%',
                  backgroundColor: 'black',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '12px 0',
                }}
                onClick={handleClickConfirm}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BagAddView;

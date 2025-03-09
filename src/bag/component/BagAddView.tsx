import React, { FC, useState } from 'react';
import Bag from '../model/Bag';

interface Props {
  bag: Bag;
}

const BagAddView: FC<Props> = ({ bag }) => {
  const [shouldShowAdd, setShouldShowAdd] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const showAdd = () => {
    setShouldShowAdd(true);
  };

  const handleChange = (e: any) => {
    setInputValue(e.target.value);
  };

  const handleClickConfirm = async () => {
    await bag.add(inputValue);
    setInputValue('');
    setShouldShowAdd(false);
  };

  const handleClickCancel = () => {
    setInputValue('');
    setShouldShowAdd(false);
  };

  return (
    <>
      <button
        style={{
          position: 'fixed',
          right: '10px',
          bottom: '90px',
          borderRadius: '12px',
          border: '1px solid black',
          width: '64px',
          height: '64px',
          background: 'black',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        }}
        onClick={showAdd}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="40"
          height="40"
          className="svg-cross"
        >
          <line
            x1="4"
            y1="12"
            x2="20"
            y2="12"
            stroke="white"
            strokeWidth="0.5"
          />
          <line
            x1="12"
            y1="4"
            x2="12"
            y2="20"
            stroke="white"
            strokeWidth="0.5"
          />
        </svg>
      </button>
      {shouldShowAdd && (
        <div
          style={{
            position: 'absolute',
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
                  borderRadius: '4px',
                  backgroundColor: 'rgba(211, 211, 211, 0.5)',
                  border: 'none',
                  width: '100%',
                }}
                placeholder={'배낭 이름을 입력해주세요'}
                value={inputValue}
                onChange={handleChange}
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
                  backgroundColor: 'lightgray',
                  borderRadius: '4px',
                  padding: '4px',
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
                  borderRadius: '4px',
                  padding: '4px',
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

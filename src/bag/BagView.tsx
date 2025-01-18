import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import Layout from '../Layout.tsx';
import Bag from './Bag.ts';
import Bottom from '../Bottom.tsx';
import BagItemView from './BagItemView.tsx';
import BagItem from './BagItem.ts';
import LoadingView from '../LoadingView.tsx';

const BagView = () => {
  const [bag] = useState(() => Bag.new());
  const [shouldShowAdd, setShouldShowAdd] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const isLoading = bag.isLoading();
  const bags = bag.getBags();
  const isEmpty = bag.isEmpty();

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

  const render = () => {
    switch (true) {
      case isLoading: {
        return <LoadingView />;
      }
      case isEmpty: {
        return (
          <div
            style={{
              height: '100%',
              fontSize: '30px',
              fontWeight: 'bold',
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '20%',
                left: '20px',
              }}
            >
              아직 등록한
              <br /> 배낭이 없어요:(
            </span>
          </div>
        );
      }
      default: {
        return (
          <div
            style={{
              height: '100%',
            }}
          >
            {bags.map((bagItem: BagItem) => (
              <BagItemView key={bagItem.getID()} bag={bag} bagItem={bagItem} />
            ))}
          </div>
        );
      }
    }
  };

  useEffect(() => {
    bag.getList();
  }, []);

  return (
    <Layout>
      <div
        style={{
          height: '60px',
          paddingLeft: '20px',
          paddingTop: '20px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            배낭
          </span>
        </div>
      </div>
      {render()}
      <Bottom />
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
            height: '200px',
            width: '100%',
            position: 'fixed',
            bottom: 0,
            border: '1px solid black',
            background: 'white',
          }}
        >
          <div>배낭 이름</div>
          <div>
            <input value={inputValue} onChange={handleChange} />
          </div>
          <button onClick={handleClickCancel}>취소</button>
          <button onClick={handleClickConfirm}>확인</button>
        </div>
      )}
    </Layout>
  );
};

export default observer(BagView);

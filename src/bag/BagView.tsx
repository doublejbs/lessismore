import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import Layout from '../Layout.tsx';
import Bag from './Bag.ts';
import Bottom from '../Bottom.tsx';
import BagItemView from './BagItemView.tsx';
import BagItem from './BagItem.ts';
import AddButton from '../warehouse/AddButton.tsx';

const BagView = () => {
  const [bag] = useState(() => Bag.new());
  const [shouldShowAdd, setShouldShowAdd] = useState(false);
  const [inputValue, setInputValue] = useState('');
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
    setShouldShowAdd(false);
  };

  const handleClickCancel = () => {
    setShouldShowAdd(false);
  };

  useEffect(() => {
    bag.getList();
  }, []);

  return (
    <Layout>
      <div>배낭</div>
      {isEmpty ? (
        <div
          style={{
            height: '100%',
          }}
        >
          아직 등록한 배낭이 없어요:(
        </div>
      ) : (
        <div
          style={{
            height: '100%',
          }}
        >
          <ul>
            {bags.map((bag: BagItem) => (
              <BagItemView key={bag.getID()} bag={bag} />
            ))}
          </ul>
        </div>
      )}
      <Bottom />
      <AddButton showAdd={showAdd} />
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

import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import BagItemView from './BagItemView.tsx';
import BagAddView from './BagAddView';
import Bag from '../model/Bag.ts';
import LoadingView from '../../LoadingView.tsx';
import BagItem from '../model/BagItem';
import Layout from '../../Layout';
import Bottom from '../../Bottom';

const BagView = () => {
  const [bag] = useState(() => Bag.new());
  const isLoading = bag.isLoading();
  const bags = bag.getBags();
  const isEmpty = bag.isEmpty();

  const render = () => {
    switch (true) {
      case isLoading: {
        return <LoadingView />;
      }
      case isEmpty: {
        return (
          <div
            style={{ height: '100%', fontSize: '30px', fontWeight: 'bold', position: 'relative' }}
          >
            <span style={{ position: 'absolute', top: '20%', left: '20px' }}>
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
              display: 'flex',
              flexDirection: 'column',
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
    <div
      style={{
        position: 'relative',
        height: '100%',
      }}
    >
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '0 20px 0 20px',
          overflowY: 'auto',
        }}
      >
        <div style={{ padding: '24px 0', fontSize: '20px', fontWeight: 'bold' }}>
          <span>총 {bags.length}개의 배낭이 있어요</span>
        </div>
        {render()}
        <div
          style={{
            minHeight: '106px',
          }}
        ></div>
        <Bottom />
        <BagAddView bag={bag} />
      </div>
    </div>
  );
};

export default observer(BagView);

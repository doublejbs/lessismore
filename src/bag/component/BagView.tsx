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
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
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
          paddingTop: '16px',
          marginBottom: '16px',
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
      <BagAddView bag={bag} />
    </Layout>
  );
};

export default observer(BagView);

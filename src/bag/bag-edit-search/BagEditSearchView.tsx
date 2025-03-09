import React, { FC, useEffect, useState } from 'react';
import BagEditSearchWarehouse from './BagEditSearchWarehouse.ts';
import BagEditSearchGearView from './BagEditSearchGearView.tsx';
import Gear from '../../search-warehouse/Gear.ts';
import { observer } from 'mobx-react-lite';
import InfinityScroll from '../../search-warehouse/InfinityScroll.tsx';
import BagEdit from '../model/BagEdit';
import { debounce } from 'lodash';

interface Props {
  bagEdit: BagEdit;
}

const BagEditSearchView: FC<Props> = ({ bagEdit }) => {
  const [bagEditSearchWarehouse] = useState(() =>
    BagEditSearchWarehouse.from(bagEdit)
  );
  const result = bagEditSearchWarehouse.getResult();
  const isLoading = bagEditSearchWarehouse.isLoading();

  useEffect(() => {
    bagEditSearchWarehouse.search('');
  }, []);

  const handleChange = debounce((e: React.ChangeEvent<HTMLInputElement>) => {
    bagEditSearchWarehouse.search(e.target.value);
  }, 300);

  const handleLoadMore = () => {
    bagEditSearchWarehouse.searchMore();
  };

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          padding: '0 16px',
          marginTop: '77px',
          backgroundColor: 'white',
          zIndex: 10,
        }}
      >
        <input
          style={{
            width: '100%',
            borderRadius: '5px',
            backgroundColor: '#F1F1F1',
            border: 'none',
          }}
          type="text"
          placeholder="제품 혹은 브랜드명으로 검색해보세요"
          onChange={handleChange}
        />
      </div>
      <div
        style={{
          padding: '24px 16px 16px 16px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <ul>
          <InfinityScroll loadMore={handleLoadMore} isLoading={isLoading}>
            {result.map((gear: Gear) => {
              return (
                <BagEditSearchGearView
                  key={gear.getId()}
                  bagEditSearchWarehouse={bagEditSearchWarehouse}
                  gear={gear}
                />
              );
            })}
          </InfinityScroll>
        </ul>
      </div>
    </>
  );
};

export default observer(BagEditSearchView);

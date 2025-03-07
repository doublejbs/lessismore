import React, { FC, useEffect, useState } from 'react';
import BagEditSearchWarehouse from './BagEditSearchWarehouse.ts';
import BagEditSearchGearView from './BagEditSearchGearView.tsx';
import Gear from '../../search-warehouse/Gear.ts';
import { observer } from 'mobx-react-lite';
import BagEdit from '../BagEdit.ts';
import InfinityScroll from '../../search-warehouse/InfinityScroll.tsx';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    bagEditSearchWarehouse.search(e.target.value);
  };

  const handleLoadMore = () => {
    bagEditSearchWarehouse.searchMore();
  };

  return (
    <div>
      <div>
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
  );
};

export default observer(BagEditSearchView);

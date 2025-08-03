import { observer } from 'mobx-react-lite';
import React, { FC } from 'react';
import SearchWarehouse from '../model/SearchWarehouse';
import SearchBarView from './SearchBarView';
import SearchBottomView from './SearchBottomView';
import SearchResultView from './SearchResultView';

interface Props {
  searchWarehouse: SearchWarehouse;
  children?: React.ReactNode;
}

const SearchWarehouseView: FC<Props> = ({ searchWarehouse }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
      }}
    >
      <SearchBarView searchWarehouse={searchWarehouse} />
      <SearchResultView searchWarehouse={searchWarehouse} />
      <SearchBottomView searchWarehouse={searchWarehouse} />
    </div>
  );
};

export default observer(SearchWarehouseView);

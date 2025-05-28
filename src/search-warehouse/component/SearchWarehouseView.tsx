import React, { FC } from 'react';
import SearchWarehouse from '../model/SearchWarehouse';
import { observer } from 'mobx-react-lite';
import SearchBarView from './SearchBarView';
import SearchResultView from './SearchResultView';
import SearchBottomView from './SearchBottomView';

interface Props {
  searchWarehouse: SearchWarehouse;
  children?: React.ReactNode;
}

const SearchWarehouseView: FC<Props> = ({ searchWarehouse }) => {
  const selectedCount = searchWarehouse.getSelectedCount();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        paddingTop: '16px',
        overflowY: 'hidden',
      }}
    >
      <SearchBarView searchWarehouse={searchWarehouse} />
      <SearchResultView searchWarehouse={searchWarehouse} />
      <SearchBottomView searchWarehouse={searchWarehouse} />
    </div>
  );
};

export default observer(SearchWarehouseView);

import React, { FC } from 'react';
import Bottom from '../../Bottom';
import { observer } from 'mobx-react-lite';
import SearchWarehouseView from './SearchWarehouseView';

interface Props {}

const SearchWarehouseWrapper: FC<Props> = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        padding: '16px',
        overflowY: 'hidden',
      }}
    >
      <SearchWarehouseView />
      <Bottom />
    </div>
  );
};

export default observer(SearchWarehouseWrapper);

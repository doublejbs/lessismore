import { FC } from 'react';
import SearchWarehouseView from '../search-warehouse/component/SearchWarehouseView';

const BagEditSearchWarehouseView: FC = () => {
  return (
    <div
      style={{
        padding: '16px',
        overflowY: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <SearchWarehouseView />
    </div>
  );
};

export default BagEditSearchWarehouseView;

import { FC } from 'react';
import Warehouse from './Warehouse';

interface Props {
  warehouse: Warehouse;
}

const WarehouseFiltersView: FC<Props> = ({ warehouse }) => {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
        gap: '4px',
        overflowY: 'scroll',
        width: 'fit-content',
      }}
    >
      {warehouse.mapFilters((filter) => {
        return (
          <div
            style={{
              height: '32px',
              borderRadius: '15px',
              backgroundColor: '#EBEBEB',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '14px',
            }}
          >
            <span>{filter}</span>
          </div>
        );
      })}
    </div>
  );
};

export default WarehouseFiltersView;

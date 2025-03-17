import { FC } from 'react';
import Warehouse from '../model/Warehouse.ts';
import WarehouseFilter from '../model/WarehouseFilter.ts';
import { observer } from 'mobx-react-lite';

interface Props {
  warehouse: Warehouse;
}

const WarehouseFiltersView: FC<Props> = ({ warehouse }) => {
  const handleClick = (filter: WarehouseFilter) => {
    warehouse.selectFilter(filter);
  };

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        gap: '4px',
        overflowX: 'scroll',
        scrollbarWidth: 'none',
      }}
    >
      {warehouse.mapFilters((filter) => {
        return (
          <button
            key={filter.getName()}
            className={'clickable'}
            style={{
              height: '30px',
              borderRadius: '16px',
              fontSize: '14px',
              padding: '0 16px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              whiteSpace: 'nowrap',
              backgroundColor: filter.isSelected() ? 'black' : '#EBEBEB',
              color: filter.isSelected() ? 'white' : 'black',
            }}
            onClick={() => handleClick(filter)}
          >
            {filter.getName()}
          </button>
        );
      })}
    </div>
  );
};

export default observer(WarehouseFiltersView);

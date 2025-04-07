import { FC } from 'react';
import Warehouse from '../model/Warehouse.ts';
import WarehouseFilter from '../model/WarehouseFilter.ts';
import { observer } from 'mobx-react-lite';

interface Props {
  warehouse: Warehouse;
}

const WarehouseFiltersView: FC<Props> = ({ warehouse }) => {
  const handleClick = (filter: WarehouseFilter) => {
    warehouse.toggleFilter(filter);
  };

  return (
    <div
      style={{
        height: '36px',
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        gap: '8px',
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
              height: '100%',
              borderRadius: '26px',
              fontSize: '16px',
              padding: '10px 18px',
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

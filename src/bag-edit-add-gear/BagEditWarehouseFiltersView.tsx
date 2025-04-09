import WarehouseFilter from '../warehouse/model/WarehouseFilter';
import Warehouse from '../warehouse/model/Warehouse';
import { FC } from 'react';
import GearFilter from '../warehouse/model/GearFilter';
import { observer } from 'mobx-react-lite';
import BagEdit from './model/BagEdit';

interface Props {
  bagEdit: BagEdit;
}

const BagEditWarehouseFiltersView: FC<Props> = ({ bagEdit }) => {
  const handleClick = (filter: WarehouseFilter) => {
    bagEdit.toggleFilter(filter);
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
      {bagEdit.mapFilters((filter) => {
        return filter.getFilter() === GearFilter.All ? (
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
            <div>{filter.getName()}</div>
          </button>
        ) : (
          <button
            key={filter.getName()}
            className={'clickable'}
            style={{
              height: '100%',
              width: '79px',
              borderRadius: '26px',
              fontSize: '16px',
              padding: '10px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '6px',
              alignItems: 'center',
              whiteSpace: 'nowrap',
              backgroundColor: filter.isSelected() ? 'black' : '#EBEBEB',
              color: filter.isSelected() ? 'white' : 'black',
            }}
            onClick={() => handleClick(filter)}
          >
            <div>{filter.getName()}</div>
            <div
              style={{
                backgroundColor: 'white',
                width: '16px',
                height: '16px',
                borderRadius: '25px',
                textAlign: 'center',
                color: 'black',
                fontSize: '12px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <span>{filter.getCount()}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default observer(BagEditWarehouseFiltersView);

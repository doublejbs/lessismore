import { FC } from 'react';
import WarehouseFilter from '../../warehouse/model/WarehouseFilter';
import BagEdit from '../model/BagEdit';

interface Props {
  bagEdit: BagEdit;
}

const BagEditFiltersView: FC<Props> = ({ bagEdit }) => {
  const handleClick = (filter: WarehouseFilter) => {
    bagEdit.toggleFilter(filter);
  };

  return (
    <div
      style={{
        width: '100%',
        paddingBottom: '15px',
        paddingLeft: '20px',
      }}
    >
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
          return (
            <button
              key={filter.getName()}
              className={'clickable'}
              style={{
                height: '36px',
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
    </div>
  );
};

export default BagEditFiltersView;

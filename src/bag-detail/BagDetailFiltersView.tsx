import { FC } from 'react';
import WarehouseFilter from '../warehouse/model/WarehouseFilter';
import BagDetail from './model/BagDetail';
import { observer } from 'mobx-react-lite';
import OrderButtonView from '../order/OrderButtonView';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailFiltersView: FC<Props> = ({ bagDetail }) => {
  const order = bagDetail.getOrder();

  const handleClick = (filter: WarehouseFilter) => {
    bagDetail.toggleFilter(filter);
  };

  return (
    <div
      style={{
        width: '100%',
        paddingBottom: '15px',
        paddingLeft: '20px',
        display: 'flex',
        flexDirection: 'row',
        gap: '8px',
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
        {bagDetail.mapFilters((filter) => {
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
      <OrderButtonView order={order} />
    </div>
  );
};

export default observer(BagDetailFiltersView);

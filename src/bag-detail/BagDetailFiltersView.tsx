import { FC } from 'react';
import WarehouseFilter from '../warehouse/model/WarehouseFilter';
import { observer } from 'mobx-react-lite';
import Order from '../order/Order';

interface BagWithFilters {
  getOrder: () => Order;
  scrollToCategory: (category: string) => void;
  isActiveCategory: (category: string) => boolean;
  hasCategoryGears: (categoryName: string) => boolean;
  mapFilters: <R>(callback: (filter: WarehouseFilter) => R) => R[];
}

interface Props {
  bagDetail: BagWithFilters;
}

const BagDetailFiltersView: FC<Props> = ({ bagDetail }) => {
  const handleClick = (filter: WarehouseFilter) => {
    bagDetail.scrollToCategory(filter.getName());
  };

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: 'white',
        borderBottom: '1px solid #E5E5E5',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {bagDetail.mapFilters((filter) => {
          const categoryName = filter.getName();

          // 해당 카테고리에 장비가 없으면 필터를 표시하지 않음
          if (!bagDetail.hasCategoryGears(categoryName)) {
            return null;
          }

          const isActive = bagDetail.isActiveCategory(categoryName);

          return (
            <button
              key={categoryName}
              className={'clickable'}
              style={{
                minWidth: 'max-content',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: isActive ? '600' : '500',
                color: isActive ? '#000000' : '#666666',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? '#000000' : 'transparent'}`,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
              onClick={() => handleClick(filter)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#000000';
                  e.currentTarget.style.borderBottomColor = '#000000';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#666666';
                  e.currentTarget.style.borderBottomColor = 'transparent';
                }
              }}
            >
              {categoryName}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default observer(BagDetailFiltersView);

import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import Order from '../order/Order';
import WarehouseFilter from '../warehouse/model/WarehouseFilter';

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
        padding: '16px',
      }}
    >
      <div
        className="hide-scrollbar"
        style={{
          display: 'flex',
          flexDirection: 'row',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          gap: '8px',
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
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: isActive ? '#FFFFFF' : '#666666',
                backgroundColor: isActive ? '#000000' : '#F5F5F5',
                border: 'none',
                borderRadius: '20px',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              onClick={() => handleClick(filter)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#E5E5E5';
                  e.currentTarget.style.color = '#000000';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#F5F5F5';
                  e.currentTarget.style.color = '#666666';
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

import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import WarehouseFilter from '../warehouse/model/WarehouseFilter';
import FilterButtonView from './component/FilterButtonView';

interface BagWithFilters {
  toggleFilter: (filter: WarehouseFilter) => void;
  toggleFilterWithScroll: (filter: WarehouseFilter) => void;
  mapFiltersWithGears: <R>(callback: (filter: WarehouseFilter) => R) => R[];
}

interface Props {
  bagDetail: BagWithFilters;
}

const BagDetailFiltersView: FC<Props> = ({ bagDetail }) => {
  return (
    <div
      style={{
        width: '100%',
        paddingBottom: '15px',
        paddingLeft: '20px',
        display: 'flex',
        flexDirection: 'row',
        gap: '8px',
        zIndex: 20,
        backgroundColor: 'white',
      }}
    >
      <div
        style={{
          height: '32px',
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          gap: '8px',
          overflowX: 'scroll',
          scrollbarWidth: 'none',
        }}
      >
        {bagDetail.mapFiltersWithGears((filter) => {
          return (
            <FilterButtonView
              key={filter.getName()}
              filter={filter}
              bagDetail={bagDetail}
            />
          );
        })}
      </div>
    </div>
  );
};

export default observer(BagDetailFiltersView);

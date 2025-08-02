import { observer } from 'mobx-react-lite';
import { FC, useEffect, useRef } from 'react';
import WarehouseFilter from '../../warehouse/model/WarehouseFilter';

interface BagWithFilters {
  toggleFilterWithScroll: (filter: WarehouseFilter) => void;
}

interface Props {
  filter: WarehouseFilter;
  bagDetail: BagWithFilters;
}

const FilterButtonView: FC<Props> = ({ filter, bagDetail }) => {
  const isSelected = filter.isSelected();
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isSelected) {
      ref.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest', 
        inline: 'center' 
      });
    }
  }, [isSelected]);

  const handleClick = () => {
    bagDetail.toggleFilterWithScroll(filter);
  };

  return (
    <button
      ref={ref}
      key={filter.getName()}
      className={'clickable'}
      style={{
        height: '32px',
        borderRadius: '22px',
        fontSize: '14px',
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        whiteSpace: 'nowrap',
        backgroundColor: isSelected ? 'black' : '#EBEBEB',
        color: isSelected ? 'white' : 'black',
      }}
      onClick={handleClick}
    >
      {filter.getName()}
    </button>
  );
};

export default observer(FilterButtonView); 
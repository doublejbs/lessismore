import { FC, useEffect, useRef } from 'react';
import Gear from '../../model/Gear';
import WarehouseFilter from '../../warehouse/model/WarehouseFilter';
import BagShare from '../model/BagShare';
import BagShareGearView from './BagShareGearView';

interface Props {
  category: WarehouseFilter;
  gears: Gear[];
  bagShare: BagShare;
  setCategoryRef: (categoryFilter: string, element: HTMLDivElement | null) => void;
  observer: IntersectionObserver | null;
}

const BagShareCategoryView: FC<Props> = ({
  category,
  gears,
  bagShare,
  setCategoryRef,
  observer,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;

    if (element) {
      setCategoryRef(category.getFilter(), element);

      if (observer) {
        if (element) {
          observer.observe(element);
        }
      }
    }
  }, [category, setCategoryRef, observer, ref]);

  return (
    <div key={category.getFilter()} ref={ref} data-category={category.getFilter()}>
      <div
        style={{
          fontSize: '1.125rem',
          fontWeight: 'bold',
          marginBottom: '12px',
          color: '#333',
        }}
      >
        {category.getName()}
      </div>
      <ul
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          gap: '16px',
        }}
      >
        {gears.map((gear) => (
          <BagShareGearView key={gear.getId()} gear={gear} />
        ))}
      </ul>
    </div>
  );
};

export default BagShareCategoryView;

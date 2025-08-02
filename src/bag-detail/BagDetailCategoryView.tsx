import { FC, useEffect, useRef } from "react";
import Gear from "../model/Gear";
import WarehouseFilter from "../warehouse/model/WarehouseFilter";
import BagDetailGearView from './BagDetailGearView';
import BagDetail from './model/BagDetail';

interface Props {
  category: WarehouseFilter;
  gears: Gear[];
  bagDetail: BagDetail;
  setCategoryRef: (categoryFilter: string, element: HTMLDivElement | null) => void;
  observer: IntersectionObserver | null;
}

const BagDetailCategoryView: FC<Props> = ({ category, gears, bagDetail, setCategoryRef, observer }) => {
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
  
  return <div 
  key={category.getFilter()}
  ref={ref}
  data-category={category.getFilter()}
>
  <div
    style={{
      fontSize: '1.125rem',
      fontWeight: 'bold',
      marginBottom: '12px',
      color: '#333',
      paddingBottom: '8px',
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
      <BagDetailGearView key={gear.getId()} gear={gear} bagDetail={bagDetail} />
    ))}
  </ul>
</div>
};

export default BagDetailCategoryView;
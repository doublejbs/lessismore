import { FC } from 'react';
import Gear from './search-warehouse/Gear';
import GearView from './GearView';
import Warehouse from './Warehouse';

interface Props {
  gear: Gear;
  warehouse: Warehouse;
}

const WarehouseGearView: FC<Props> = ({ gear, warehouse }) => {
  const handleClick = () => {
    warehouse.remove(gear);
  };

  return (
    <GearView gear={gear}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'start',
          alignItems: 'start',
          width: '36px',
        }}
      >
        <button
          style={{
            height: '36px',
            width: '36px',
            backgroundColor: '#F1F1F1',
            marginTop: '10px',
          }}
          onClick={handleClick}
        >
          -
        </button>
      </div>
    </GearView>
  );
};

export default WarehouseGearView;

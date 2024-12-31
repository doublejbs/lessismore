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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="36"
            height="36"
            className="svg-cross"
          >
            <line
              x1="4"
              y1="12"
              x2="20"
              y2="12"
              stroke="black"
              strokeWidth="0.5"
            />
          </svg>
        </button>
      </div>
    </GearView>
  );
};

export default WarehouseGearView;

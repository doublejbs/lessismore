import React, { FC } from 'react';
import Warehouse from './Warehouse';
import Gear from '../model/Gear';
import GearImageView from './GearImageView.tsx';
import app from '../App';
import GearView from './GearView.tsx';

interface Props {
  gear: Gear;
  warehouse: Warehouse;
}

const WarehouseGearView: FC<Props> = ({ gear, warehouse }) => {
  const imageUrl = gear.getImageUrl();
  const warehouseEdit = app.getWarehouseEdit();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    warehouse.remove(gear);
  };

  const handleClickEdit = () => {
    warehouseEdit.open(gear, async (updatedGear) => {
      await warehouse.updateGear(updatedGear);
    });
  };

  return (
    <GearView gear={gear} onClick={handleClickEdit}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: '40px',
          height: '80px',
          justifyContent: 'center',
        }}
      >
        <button
          style={{
            backgroundColor: '#F1F1F1',
            padding: '0 4px',
            height: '32px',
            fontSize: '14px',
            borderRadius: '8px',
          }}
          onClick={handleClick}
        >
          삭제
        </button>
      </div>
    </GearView>
  );
};

export default WarehouseGearView;

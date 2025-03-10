import React, { FC } from 'react';
import Warehouse from './Warehouse';
import Gear from '../model/Gear';
import GearImageView from './GearImageView.tsx';
import app from '../App';

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
    <li
      style={{
        backgroundColor: 'white',
      }}
      onClick={handleClickEdit}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          gap: '8px',
        }}
      >
        <div
          style={{
            height: '100%',
            backgroundColor: '#F1F1F1',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            aspectRatio: '2000 / 2000',
            borderRadius: '4px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '32px',
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              borderRadius: '0.25rem',
              overflow: 'hidden',
            }}
          >
            <button
              style={{
                width: '32px',
                backgroundColor: '#F1F1F1',
                borderRadius: '5px',
              }}
              onClick={handleClick}
            >
              🗑️
            </button>
          </div>
          <GearImageView imageUrl={imageUrl} />
        </div>
        <div
          style={{
            display: 'flex',
            height: '100%',
            flexDirection: 'column',
            gap: '.125rem',
            fontSize: '12px',
          }}
        >
          <span
            style={{
              fontWeight: 'bold',
            }}
          >
            {gear.getCompany()}
          </span>
          <p
            className={'text-ellipsis'}
            style={{
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              fontSize: '16px',
            }}
          >
            {gear.getName()}
          </p>
          <span
            style={{
              fontWeight: 'bold',
            }}
          >
            {gear.getWeight()}g
          </span>
        </div>
      </div>
    </li>
  );
};

export default WarehouseGearView;

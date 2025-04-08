import React, { FC } from 'react';
import Gear from '../model/Gear';
import BagEdit from '../bag/model/BagEdit';
import { observer } from 'mobx-react-lite';
import GearView from '../warehouse/component/GearView';

interface Props {
  gear: Gear;
  bagEdit: BagEdit;
}

const BagEditWarehouseGearView: FC<Props> = ({ gear, bagEdit }) => {
  const imageUrl = gear.getImageUrl();
  const isSelected = bagEdit.hasGear(gear);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (isSelected) {
      bagEdit.removeGear(gear);
    } else {
      bagEdit.addGear(gear);
    }
  };

  return (
    <GearView gear={gear}>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        <input
          type='checkbox'
          checked={isSelected}
          onChange={handleChange}
          style={{
            position: 'absolute',
            opacity: 0,
            width: 0,
            height: 0,
          }}
        />
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            backgroundColor: isSelected ? '#000' : '#fff',
            border: '2px solid #000',
            borderRadius: '4px',
            transition: 'all 0.2s',
          }}
        >
          {isSelected && (
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='white'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <polyline points='20 6 9 17 4 12' />
            </svg>
          )}
        </span>
      </label>
    </GearView>
  );
};

export default observer(BagEditWarehouseGearView);

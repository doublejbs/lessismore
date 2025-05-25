import React, { FC } from 'react';
import Gear from '../model/Gear';
import BagEdit from './model/BagEdit';
import { observer } from 'mobx-react-lite';
import GearView from '../warehouse/component/GearView';

interface Props {
  gear: Gear;
  bagEdit: BagEdit;
}

const BagEditWarehouseGearView: FC<Props> = ({ gear, bagEdit }) => {
  const isSelected = bagEdit.hasGear(gear);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    bagEdit.toggleGear(gear);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    bagEdit.toggleGear(gear);
  };

  return (
    <GearView gear={gear} onClick={handleClick}>
      <label
        htmlFor={`bag-edit-gear-checkbox-${gear.getId()}`}
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
          id={`bag-edit-gear-checkbox-${gear.getId()}`}
          type='checkbox'
          checked={isSelected}
          onChange={handleChange}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            opacity: 0,
            width: '100%',
            height: '100%',
            margin: 0,
            cursor: 'pointer',
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

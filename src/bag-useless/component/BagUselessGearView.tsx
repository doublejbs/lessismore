import React, { FC } from 'react';
import GearView from '../../warehouse/component/GearView';
import Gear from '../../model/Gear';
import BagUseless from '../model/BagUseless';
import { observer } from 'mobx-react-lite';

interface Props {
  gear: Gear;
  bagUseless: BagUseless;
}

const BagUselessGearView: FC<Props> = ({ gear, bagUseless }) => {
  const isSelected = bagUseless.isSelected(gear);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    bagUseless.toggle(gear);
  };

  return (
    <GearView gear={gear}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: '24px',
          height: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            width: '24px',
            height: '24px',
            flexShrink: 0,
          }}
        >
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
        </div>
      </div>
    </GearView>
  );
};

export default observer(BagUselessGearView);

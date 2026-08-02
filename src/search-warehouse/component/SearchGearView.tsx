import React, { FC } from 'react';
import { observer } from 'mobx-react-lite';
import SearchWarehouse from '../model/SearchWarehouse';
import Gear from '../../model/Gear';
import GearView from '../../warehouse/component/GearView.tsx';

interface Props {
  searchWarehouse: SearchWarehouse;
  gear: Gear;
}

const SearchGearView: FC<Props> = ({ gear, searchWarehouse }) => {
  const isAdded = gear.isAdded();
  const isSelected = searchWarehouse.isSelected(gear);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isAdded) {
      return;
    } else {
      searchWarehouse.toggle(gear);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    searchWarehouse.toggle(gear);
  };

  return (
    <GearView gear={gear} onClick={handleClick}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: '40px',
          height: '80px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            flexShrink: 0,
          }}
        >
          {isAdded ? (
            <div
              style={{
                fontSize: '12px',
                backgroundColor: '#F6F6F6',
                borderRadius: '3px',
              }}
            >
              보유중
            </div>
          ) : (
            <label
              htmlFor={`search-gear-checkbox-${gear.getId()}`}
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
                id={`search-gear-checkbox-${gear.getId()}`}
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
          )}
        </div>
      </div>
    </GearView>
  );
};

export default observer(SearchGearView);

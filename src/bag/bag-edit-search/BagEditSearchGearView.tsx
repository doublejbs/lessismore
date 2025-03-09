import React, { FC } from 'react';
import BagEditSearchWarehouse from './BagEditSearchWarehouse.ts';
import Gear from '../../search-warehouse/Gear.ts';
import GearView from '../../warehouse/GearView.tsx';
import { observer } from 'mobx-react-lite';

interface Props {
  bagEditSearchWarehouse: BagEditSearchWarehouse;
  gear: Gear;
}

const BagEditSearchGearView: FC<Props> = ({ bagEditSearchWarehouse, gear }) => {
  const isAdded = gear.isAdded();

  const handleClick = () => {
    if (isAdded) {
      bagEditSearchWarehouse.deselect(gear);
    } else {
      bagEditSearchWarehouse.select(gear);
    }
  };

  const renderButton = () => {
    if (isAdded) {
      return (
        <button
          style={{
            backgroundColor: 'black',
            padding: '8px',
            fontSize: '12px',
            color: 'white',
            borderRadius: '4px',
          }}
          onClick={handleClick}
        >
          삭제
        </button>
      );
    } else {
      return (
        <button
          style={{
            backgroundColor: '#F1F1F1',
            padding: '8px',
            fontSize: '12px',
            borderRadius: '4px',
          }}
          onClick={handleClick}
        >
          추가
        </button>
      );
    }
  };

  return (
    <GearView gear={gear}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minWidth: '48px',
        }}
      >
        {renderButton()}
      </div>
    </GearView>
  );
};

export default observer(BagEditSearchGearView);

import React, { FC } from 'react';
import { observer } from 'mobx-react-lite';
import SearchWarehouse from './SearchWarehouse';
import Gear from './Gear';
import GearView from '../warehouse/GearView';

interface Props {
  searchWarehouse: SearchWarehouse;
  gear: Gear;
}

const SearchGearView: FC<Props> = ({ gear, searchWarehouse }) => {
  const isAdded = gear.isAdded();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdded) {
      searchWarehouse.deselect(gear);
    } else {
      searchWarehouse.select(gear);
    }
  };

  const renderButton = () => {
    if (isAdded) {
      return (
        <button
          style={{
            backgroundColor: 'black',
            padding: '4px',
            height: '32px',
            fontSize: '12px',
            color: 'white',
            borderRadius: '8px',
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
            padding: '4px',
            height: '35px',
            fontSize: '12px',
            borderRadius: '8px',
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
          minWidth: '48px',
          height: '100%',
          justifyContent: 'center',
        }}
      >
        {renderButton()}
      </div>
    </GearView>
  );
};

export default observer(SearchGearView);

import { FC } from 'react';
import GearView from '../GearView';
import { observer } from 'mobx-react-lite';
import SearchWarehouse from './SearchWarehouse';
import Gear from './Gear';
import Warehouse from '../Warehouse';

interface Props {
  searchWarehouse: SearchWarehouse;
  warehouse: Warehouse;
  gear: Gear;
}

const SearchGearView: FC<Props> = ({ gear, searchWarehouse, warehouse }) => {
  const isSelected = searchWarehouse.isSelected(gear);
  const isAdded = warehouse.hasGear(gear);

  const handleClick = () => {
    if (isSelected) {
      searchWarehouse.deselect(gear);
    } else {
      searchWarehouse.select(gear);
    }
  };

  const renderButton = () => {
    if (isAdded) {
      return (
        <div
          style={{
            backgroundColor: 'black',
            padding: '4px',
            height: '35px',
            fontSize: '12px',
            color: 'white',
          }}
        >
          보유중
        </div>
      );
    } else if (isSelected) {
      return (
        <button
          style={{
            backgroundColor: 'black',
            padding: '4px',
            height: '35px',
            fontSize: '12px',
            color: 'white',
          }}
          onClick={handleClick}
        >
          선택됨
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
          flexDirection: 'column-reverse',
          width: '50px',
        }}
      >
        {renderButton()}
      </div>
    </GearView>
  );
};

export default observer(SearchGearView);

import React, { FC } from 'react';
import BagEditImageView from './BagEditImageView';
import Gear from '../../model/Gear';
import BagEdit from '../model/BagEdit';
import { observer } from 'mobx-react-lite';

interface Props {
  gear: Gear;
  bagEdit: BagEdit;
}

const BagEditWarehouseGearView: FC<Props> = ({ gear, bagEdit }) => {
  const imageUrl = gear.getImageUrl();
  const isAdded = bagEdit.hasGear(gear);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdded) {
      bagEdit.removeGear(gear);
    } else {
      bagEdit.addGear(gear);
    }
  };

  return (
    <li
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '8px',
      }}
      key={gear.getId()}
    >
      <div
        style={{
          aspectRatio: '2000 / 2000',
          width: '80px',
          height: '80px',
        }}
      >
        <BagEditImageView imageUrl={imageUrl} />
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flexGrow: 1,
        }}
      >
        <span
          className={'text-ellipsis'}
          style={{
            fontWeight: 'bold',
          }}
        >
          {gear.getName()}
        </span>
        <span style={{}}>
          {gear.getWeight() ? `${gear.getWeight()}g` : ' '}
        </span>
      </div>
      <div
        style={{
          minWidth: '48px',
          fontSize: '12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {isAdded ? (
          <button
            style={{
              backgroundColor: 'black',
              color: 'white',
              padding: '8px',
              borderRadius: '5px',
            }}
            onClick={handleClick}
          >
            삭제
          </button>
        ) : (
          <button
            style={{
              backgroundColor: '#F1F1F1',
              borderRadius: '5px',
              padding: '8px',
            }}
            onClick={handleClick}
          >
            추가
          </button>
        )}
      </div>
    </li>
  );
};

export default observer(BagEditWarehouseGearView);

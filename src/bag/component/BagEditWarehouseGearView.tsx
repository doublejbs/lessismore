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

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdded) {
      await bagEdit.removeGear(gear);
    } else {
      await bagEdit.addGear(gear);
    }
  };

  return (
    <li
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
      key={gear.getId()}
      onClick={handleClick}
    >
      <div
        style={{
          position: 'relative',
          aspectRatio: '2000 / 2000',
          width: '100%',
        }}
      >
        <BagEditImageView imageUrl={imageUrl} shadow={isAdded} />
        {isAdded && (
          <div
            style={{
              position: 'absolute',
              bottom: '4px',
              right: '4px',
              zIndex: 10,
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 26 26"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="13" cy="13" r="13" fill="black" />
              <circle
                cx="13"
                cy="13"
                r="12"
                stroke="white"
                stroke-width="2"
                fill="none"
              />
              <path
                d="M8 13L12 17L18 9"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
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
        <div style={{}}>
          <span>{gear.getWeight() ? `${gear.getWeight()}g` : ' '}</span>
          {/*useless 몇회 추가*/}
        </div>
      </div>
      {/*<div*/}
      {/*  style={{*/}
      {/*    fontSize: '12px',*/}
      {/*    display: 'flex',*/}
      {/*    justifyContent: 'center',*/}
      {/*  }}*/}
      {/*>*/}
      {/*  {isAdded ? (*/}
      {/*    <button*/}
      {/*      style={{*/}
      {/*        backgroundColor: 'black',*/}
      {/*        color: 'white',*/}
      {/*        padding: '8px',*/}
      {/*        borderRadius: '5px',*/}
      {/*      }}*/}
      {/*      onClick={handleClick}*/}
      {/*    >*/}
      {/*      삭제*/}
      {/*    </button>*/}
      {/*  ) : (*/}
      {/*    <button*/}
      {/*      style={{*/}
      {/*        backgroundColor: '#F1F1F1',*/}
      {/*        borderRadius: '5px',*/}
      {/*        padding: '8px',*/}
      {/*      }}*/}
      {/*      onClick={handleClick}*/}
      {/*    >*/}
      {/*      추가*/}
      {/*    </button>*/}
      {/*  )}*/}
      {/*</div>*/}
    </li>
  );
};

export default observer(BagEditWarehouseGearView);

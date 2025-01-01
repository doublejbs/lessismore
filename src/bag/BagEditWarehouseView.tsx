import { FC, useEffect, useState } from 'react';
import Warehouse from '../warehouse/Warehouse.ts';
import { observer } from 'mobx-react-lite';
import BagEdit from './BagEdit.ts';

interface Props {
  onClose: () => void;
  bagEdit: BagEdit;
}

const BagEditWarehouseView: FC<Props> = ({ onClose, bagEdit }) => {
  const [warehouse] = useState(() => Warehouse.new());
  const gears = warehouse.getGears();

  useEffect(() => {
    warehouse.getList();
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        height: '480px',
        width: '100%',
        borderRadius: '20px 20px 0',
        outline: '5px solid transparent',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
        backgroundColor: 'white',
        zIndex: 100,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          textAlign: 'center',
        }}
      >
        <button onClick={onClose}>닫기</button>
      </div>
      <div
        style={{
          padding: '10px 20px',
          fontWeight: 'bold',
          fontSize: '30px',
        }}
      >
        <span>창고</span>
      </div>
      <div
        style={{
          width: '100%',
          overflowY: 'auto',
          marginLeft: '10px',
          marginRight: '10px',
        }}
      >
        <ul
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'start',
            width: '100%',
            height: '100%',
            flexWrap: 'wrap',
          }}
        >
          {gears.map((gear) => {
            const imageUrl = gear.getImageUrl();
            const isAdded = bagEdit.hasGear(gear);

            const handleClick = async () => {
              if (isAdded) {
                await bagEdit.removeGear(gear);
              } else {
                await bagEdit.addGear(gear);
              }
            };

            return (
              <div
                style={{
                  width: '30%',
                  height: '30%',
                  marginBottom: '40px',
                  marginRight: '10px',
                }}
                key={gear.getId()}
                onClick={handleClick}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={gear.getName()}
                    width={'100%'}
                    height={'100%'}
                    style={{
                      filter: isAdded ? 'brightness(50%)' : 'none',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#F1F1F1',
                      filter: isAdded ? 'brightness(50%)' : 'none',
                    }}
                  ></div>
                )}
                <div
                  style={{
                    textAlign: 'center',
                    height: '30px',
                    fontSize: '14px',
                  }}
                >
                  <span>{gear.getName()}</span>
                </div>
              </div>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default observer(BagEditWarehouseView);

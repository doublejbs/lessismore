import { FC, useEffect, useState } from 'react';
import Warehouse from '../warehouse/Warehouse.ts';
import { observer } from 'mobx-react-lite';

interface Props {
  onClose: () => void;
}

const BagEditWarehouseView: FC<Props> = ({ onClose }) => {
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
          height: '100%',
        }}
      >
        <ul
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-around',
            width: '100%',
            height: '100%',
          }}
        >
          {gears.map((gear) => (
            <div
              style={{
                width: '30%',
                height: '30%',
              }}
              key={gear.getId()}
            >
              <img src={gear.getImageUrl()} alt={gear.getName()} />
              <div
                style={{
                  textAlign: 'center',
                }}
              >
                <span>{gear.getName()}</span>
              </div>
            </div>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default observer(BagEditWarehouseView);

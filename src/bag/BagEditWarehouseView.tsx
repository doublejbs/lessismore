import BagEditImageView from './BagEditImageView';
import { FC, useEffect, useState } from 'react';
import Warehouse from '../warehouse/Warehouse';
import BagEdit from './BagEdit';
import { observer } from 'mobx-react-lite';

interface Props {
  bagEdit: BagEdit;
}

const BagEditWarehouseView: FC<Props> = ({ bagEdit }) => {
  const [warehouse] = useState(() => Warehouse.new());
  const gears = warehouse.getGears();

  useEffect(() => {
    warehouse.getList();
  }, []);

  return (
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
              <BagEditImageView imageUrl={imageUrl} isAdded={isAdded} />
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
  );
};

export default observer(BagEditWarehouseView);

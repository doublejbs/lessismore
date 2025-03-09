import BagEditImageView from './BagEditImageView';
import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import Warehouse from '../../warehouse/Warehouse';
import BagEdit from '../model/BagEdit';
import BagEditWarehouseGearView from './BagEditWarehouseGearView';

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
        flexDirection: 'column',
        padding: '0 16px',
        gap: '16px',
      }}
    >
      {gears.map((gear) => {
        return (
          <BagEditWarehouseGearView
            key={gear.getId()}
            gear={gear}
            bagEdit={bagEdit}
          />
        );
      })}
    </ul>
  );
};

export default observer(BagEditWarehouseView);

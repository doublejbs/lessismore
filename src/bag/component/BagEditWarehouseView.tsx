import BagEditImageView from './BagEditImageView';
import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import Warehouse from '../../warehouse/model/Warehouse.ts';
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
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill,minmax(min(100px,100%),1fr))',
        rowGap: '1.25rem',
        columnGap: '0.625rem',
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

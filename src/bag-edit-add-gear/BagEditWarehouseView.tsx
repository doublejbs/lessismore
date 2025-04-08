import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import Warehouse from '../warehouse/model/Warehouse.ts';
import BagEdit from '../bag/model/BagEdit.ts';
import BagEditWarehouseGearView from './BagEditWarehouseGearView.tsx';

interface Props {
  bagEdit: BagEdit;
  warehouse: Warehouse;
}

const BagEditWarehouseView: FC<Props> = ({ bagEdit, warehouse }) => {
  const gears = warehouse.getGears();

  return (
    <ul
      style={{
        padding: '0 20px',
      }}
    >
      {gears.map((gear) => {
        return <BagEditWarehouseGearView key={gear.getId()} gear={gear} bagEdit={bagEdit} />;
      })}
    </ul>
  );
};

export default observer(BagEditWarehouseView);

import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import BagEdit from './model/BagEdit.ts';
import BagEditWarehouseGearView from './BagEditWarehouseGearView.tsx';

interface Props {
  bagEdit: BagEdit;
}

const BagEditWarehouseView: FC<Props> = ({ bagEdit }) => {
  return (
    <ul
      style={{
        padding: '0 20px',
      }}
    >
      {bagEdit.mapWarehouseGears((gear) => {
        return <BagEditWarehouseGearView key={gear.getId()} gear={gear} bagEdit={bagEdit} />;
      })}
    </ul>
  );
};

export default observer(BagEditWarehouseView);

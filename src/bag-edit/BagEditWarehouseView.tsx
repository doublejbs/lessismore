import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import Warehouse from '../warehouse/model/Warehouse.ts';
import BagEdit from '../bag/model/BagEdit';
import BagEditWarehouseGearView from './BagEditWarehouseGearView';
import { useNavigate } from 'react-router-dom';
import WarehouseDispatcher from '../warehouse/model/WarehouseDispatcher.ts';
import app from '../App';

interface Props {
  bagEdit: BagEdit;
}

const BagEditWarehouseView: FC<Props> = ({ bagEdit }) => {
  const [warehouse] = useState(() =>
    Warehouse.from(WarehouseDispatcher.new(), app.getToastManager()),
  );
  const gears = warehouse.getGears();

  useEffect(() => {
    warehouse.getList();
  }, []);

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

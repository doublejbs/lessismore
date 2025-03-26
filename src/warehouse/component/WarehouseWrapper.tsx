import { FC, useState } from 'react';
import WarehouseView from './WarehouseView.tsx';
import Warehouse from '../model/Warehouse.ts';
import { observer } from 'mobx-react-lite';
import WarehouseDispatcher from '../model/WarehouseDispatcher.ts';
import app from '../../App';

interface Props {}

const WarehouseWrapper: FC<Props> = () => {
  const [warehouse] = useState(() =>
    Warehouse.from(WarehouseDispatcher.new(), app.getToastManager())
  );

  return <WarehouseView warehouse={warehouse} />;
};

export default observer(WarehouseWrapper);

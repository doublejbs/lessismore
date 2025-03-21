import { FC, useState } from 'react';
import WarehouseView from './WarehouseView.tsx';
import Warehouse from '../model/Warehouse.ts';
import { observer } from 'mobx-react-lite';
import CustomGear from '../custom-gear/model/CustomGear.ts';
import CustomGearView from '../custom-gear/component/CustomGearView.tsx';
import WarehouseDispatcher from '../model/WarehouseDispatcher.ts';

interface Props {}

const WarehouseWrapper: FC<Props> = () => {
  const [warehouse] = useState(() => Warehouse.from(WarehouseDispatcher.new()));
  const [customGear] = useState(() => CustomGear.new());
  const shouldShowCustom = customGear.isVisible();

  if (shouldShowCustom) {
    return <CustomGearView customGear={customGear} />;
  } else {
    return <WarehouseView warehouse={warehouse} customGear={customGear} />;
  }
};

export default observer(WarehouseWrapper);

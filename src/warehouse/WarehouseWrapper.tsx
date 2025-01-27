import { FC, useState } from 'react';
import WarehouseView from './WarehouseView';
import Warehouse from './Warehouse';
import { observer } from 'mobx-react-lite';
import CustomGearView from './custom-gear/CustomGearView.tsx';
import CustomGear from './custom-gear/CustomGear.ts';

interface Props {}

const WarehouseWrapper: FC<Props> = () => {
  const [warehouse] = useState(() => Warehouse.new());
  const [customGear] = useState(() => CustomGear.new());
  const shouldShowCustom = customGear.isVisible();

  if (shouldShowCustom) {
    return <CustomGearView customGear={customGear} />;
  } else {
    return <WarehouseView warehouse={warehouse} customGear={customGear} />;
  }
};

export default observer(WarehouseWrapper);

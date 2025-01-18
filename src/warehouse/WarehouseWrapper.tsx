import { FC, useState } from 'react';
import WarehouseView from './WarehouseView';
import Warehouse from './Warehouse';
import { observer } from 'mobx-react-lite';
import CustomGearView from './custom-gear/CustomGearView.tsx';

interface Props {}

const WarehouseWrapper: FC<Props> = () => {
  const [warehouse] = useState(() => Warehouse.new());
  const shouldShowCustom = warehouse.shouldShowCustom();

  if (shouldShowCustom) {
    return <CustomGearView warehouse={warehouse} />;
  } else {
    return <WarehouseView warehouse={warehouse} />;
  }
};

export default observer(WarehouseWrapper);

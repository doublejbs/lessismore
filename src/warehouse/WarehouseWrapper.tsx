import { FC, useState } from 'react';
import WarehouseView from './WarehouseView';
import Warehouse from './Warehouse';
import SearchWarehouseView from './search-warehouse/SearchWarehouseView';
import { observer } from 'mobx-react-lite';
import CustomGearView from './custom-gear/CustomGearView.tsx';

interface Props {}

const WarehouseWrapper: FC<Props> = () => {
  const [warehouse] = useState(() => Warehouse.new());
  const shouldShowSearch = warehouse.shouldShowSearch();
  const shouldShowCustom = warehouse.shouldShowCustom();

  if (shouldShowSearch) {
    return <SearchWarehouseView warehouse={warehouse} />;
  } else if (shouldShowCustom) {
    return <CustomGearView warehouse={warehouse} />;
  } else {
    return <WarehouseView warehouse={warehouse} />;
  }
};

export default observer(WarehouseWrapper);

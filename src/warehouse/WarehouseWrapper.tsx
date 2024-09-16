import { FC, useState } from 'react';
import WarehouseView from './WarehouseView';
import Warehouse from './Warehouse';
import SearchWarehouseView from './search-warehouse/SearchWarehouseView';

interface Props {}

const WarehouseWrapper: FC<Props> = () => {
  const [shouldShowSearch, setShouldShowSearch] = useState(false);
  const [warehouse] = useState(() => Warehouse.new());

  const showAdd = () => {
    setShouldShowSearch(true);
  };

  const hideAdd = () => {
    setShouldShowSearch(false);
  };

  if (shouldShowSearch) {
    return <SearchWarehouseView hideAdd={hideAdd} warehouse={warehouse} />;
  } else {
    return <WarehouseView showAdd={showAdd} warehouse={warehouse} />;
  }
};

export default WarehouseWrapper;

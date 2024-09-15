import { FC, useState } from 'react';
import Warehouse from './Warehouse';
import AddWarehouse from './AddWarehouse';

interface Props {}

const WarehouseWrapper: FC<Props> = () => {
  const [shouldShowAdd, setShouldShowAdd] = useState(false);

  const showAdd = () => {
    setShouldShowAdd(true);
  };

  const hideAdd = () => {
    setShouldShowAdd(false);
  };

  if (shouldShowAdd) {
    return <AddWarehouse hideAdd={hideAdd} />;
  } else {
    return <Warehouse showAdd={showAdd} />;
  }
};

export default WarehouseWrapper;

import { FC, useState } from 'react';
import BagEditSearchWarehouse from './BagEditSearchWarehouse';

interface Props {}

const BagEditSearchView: FC<Props> = () => {
  const [bagEditSearchWarehouse] = useState(() => BagEditSearchWarehouse.new());

  return <div>BagEditSearchView</div>;
};

export default BagEditSearchView;

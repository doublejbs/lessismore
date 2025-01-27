import { FC, useState } from 'react';
import WarehouseEdit from './WarehouseEdit.ts';
import Layout from '../../Layout.tsx';

const WarehouseEditView: FC = () => {
  const [warehouseEdit] = useState(() => WarehouseEdit.new());

  return (
    <Layout>
      <div></div>
    </Layout>
  );
};

export default WarehouseEditView;

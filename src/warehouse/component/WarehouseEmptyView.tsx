import { FC } from 'react';
import Layout from '../../Layout';
import Bottom from '../../Bottom';
import AddButtonView from './AddButtonView';

const WarehouseEmptyView: FC = () => {
  const handleClick = () => {};

  return (
    <Layout>
      <AddButtonView />
      <Bottom />
    </Layout>
  );
};

export default WarehouseEmptyView;

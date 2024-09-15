import React from 'react';
import { observer } from 'mobx-react-lite';
import Top from '../Top.tsx';
import Layout from '../Layout.tsx';

const Bag = () => {
  return (
    <Layout>
      <img src={'/bag.png'} alt="Bag" />
    </Layout>
  );
};

export default observer(Bag);

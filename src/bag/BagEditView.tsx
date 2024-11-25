import { useParams } from 'react-router-dom';
import { FC, useEffect, useState } from 'react';
import BagEdit from './BagEdit.ts';
import Layout from '../Layout.tsx';
import { observer } from 'mobx-react-lite';

const BagEditView: FC = () => {
  const { id } = useParams();
  const [bagEdit] = useState(() => BagEdit.from(id ?? ''));
  const name = bagEdit.getName();

  useEffect(() => {
    bagEdit.initialize();
  }, []);

  return (
    <Layout>
      <div>{name}</div>
    </Layout>
  );
};

export default observer(BagEditView);

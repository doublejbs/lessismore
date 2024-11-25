import { useParams } from 'react-router-dom';
import { FC, useEffect, useState } from 'react';
import BagEdit from './BagEdit.ts';
import Layout from '../Layout.tsx';
import { observer } from 'mobx-react-lite';

const BagEditView: FC = () => {
  const { id } = useParams();
  const [bagEdit] = useState(() => BagEdit.from(id ?? ''));
  const name = bagEdit.getName();
  const weight = bagEdit.getWeight();
  const gears = bagEdit.getGears();

  const handleClickAdd = () => {};

  useEffect(() => {
    bagEdit.initialize();
  }, []);

  return (
    <Layout>
      <div>{name}</div>
      <div>{weight}kg</div>
      <button onClick={handleClickAdd}>배낭 채우기</button>
      <ul>
        {gears.map((gear) => (
          <div>{gear.getName()}</div>
        ))}
      </ul>
    </Layout>
  );
};

export default observer(BagEditView);

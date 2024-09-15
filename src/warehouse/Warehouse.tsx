import { FC, useEffect, useState } from 'react';
import App from '../App.ts';
import Layout from '../Layout.tsx';
import GearType from './type/GearType.ts';
import GearView from './GearView.tsx';
import Bottom from '../Bottom.tsx';
import AddButton from './AddButton.tsx';

interface Props {
  showAdd: () => void;
}

const Warehouse: FC<Props> = ({ showAdd }) => {
  const [gear, setGears] = useState<Array<GearType>>([]);

  useEffect(() => {
    (async () => {
      setGears(await App.getGearStore().getList());
    })();
  }, []);

  return (
    <Layout>
      <div>창고</div>
      <div
        style={{
          height: '100%',
        }}
      >
        <ul
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {gear.map((gear) => (
            <GearView key={gear.id} gear={gear} />
          ))}
        </ul>
      </div>
      <Bottom />
      <AddButton showAdd={showAdd} />
    </Layout>
  );
};

export default Warehouse;

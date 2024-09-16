import { FC, useEffect } from 'react';
import Layout from '../Layout.tsx';
import Bottom from '../Bottom.tsx';
import AddButton from './AddButton.tsx';
import Warehouse from './Warehouse.ts';
import { observer } from 'mobx-react-lite';
import WarehouseGearView from './WarehouseGearView.tsx';
import app from '../App.ts';

interface Props {
  showAdd: () => void;
  warehouse: Warehouse;
}

const WarehouseView: FC<Props> = ({ showAdd, warehouse }) => {
  const gears = warehouse.getGears();

  useEffect(() => {
    warehouse.getList();
  }, []);

  return (
    <Layout>
      <div>창고</div>
      {/* <button
        onClick={() => {
          app.getFirebase().logout();
        }}
      >
        로그아웃
      </button> */}
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
          {gears.map((gear) => (
            <WarehouseGearView
              key={gear.getId()}
              gear={gear}
              warehouse={warehouse}
            />
          ))}
        </ul>
      </div>
      <Bottom />
      <AddButton showAdd={showAdd} />
    </Layout>
  );
};

export default observer(WarehouseView);

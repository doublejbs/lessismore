import { FC, useEffect } from 'react';
import Layout from '../Layout.tsx';
import Bottom from '../Bottom.tsx';
import Warehouse from './Warehouse.ts';
import { observer } from 'mobx-react-lite';
import WarehouseGearView from './WarehouseGearView.tsx';
import CustomGearAddButtonView from './custom-gear/CustomGearAddButtonView.tsx';
import CustomGear from './custom-gear/CustomGear.ts';

interface Props {
  warehouse: Warehouse;
  customGear: CustomGear;
}

const WarehouseView: FC<Props> = ({ warehouse, customGear }) => {
  const gears = warehouse.getGears();

  useEffect(() => {
    warehouse.getList();
  }, []);

  return (
    <Layout>
      <div
        style={{
          height: '150px',
          paddingLeft: '20px',
          paddingTop: '20px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            창고
          </span>
        </div>
        <div
          style={{
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              width: '58px',
              height: '32px',
              borderRadius: '15px',
              backgroundColor: '#EBEBEB',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '14px',
            }}
          >
            <span>전체</span>
          </div>
        </div>
      </div>
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
          overflow: 'auto',
          marginBottom: '60px',
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
      <CustomGearAddButtonView customGear={customGear} />
      <Bottom />
    </Layout>
  );
};

export default observer(WarehouseView);

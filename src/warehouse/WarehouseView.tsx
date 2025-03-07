import { FC, useEffect } from 'react';
import Layout from '../Layout.tsx';
import Bottom from '../Bottom.tsx';
import Warehouse from './Warehouse.ts';
import { observer } from 'mobx-react-lite';
import WarehouseGearView from './WarehouseGearView.tsx';
import CustomGearAddButtonView from './custom-gear/CustomGearAddButtonView.tsx';
import CustomGear from './custom-gear/CustomGear.ts';
import WarehouseFiltersView from './WarehouseFiltersView';

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
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            fontWeight: '1000',
            fontSize: '32px',
            textAlign: 'center',
            height: '48px',
          }}
        >
          USELESS
        </div>
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
        <WarehouseFiltersView warehouse={warehouse} />
      </div>
      <div
        style={{
          width: '100%',
          height: '100%',
          overflowY: 'auto',
          marginBottom: '60px',
        }}
      >
        <ul
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '8px',
            width: '100%',
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

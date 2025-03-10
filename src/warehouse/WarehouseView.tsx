import { FC, useEffect } from 'react';
import Layout from '../Layout.tsx';
import Bottom from '../Bottom.tsx';
import Warehouse from './Warehouse.ts';
import { observer } from 'mobx-react-lite';
import WarehouseGearView from './WarehouseGearView.tsx';
import WarehouseFiltersView from './WarehouseFiltersView';
import CustomGear from './custom-gear/model/CustomGear';
import CustomGearAddButtonView from './custom-gear/component/CustomGearAddButtonView';
import WarehouseEditWrapperView from './edit/component/WarehouseEditWrapperView';

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
          marginTop: '8px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            fontWeight: '1000',
            fontSize: '32px',
            textAlign: 'center',
            display: 'inline-block',
            lineHeight: 1,
          }}
        >
          useless
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
            gridTemplateColumns:
              'repeat(auto-fill,minmax(min(128px,100%),1fr))',
            rowGap: '1.25rem',
            columnGap: '0.625rem',
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
      <WarehouseEditWrapperView />
    </Layout>
  );
};

export default observer(WarehouseView);

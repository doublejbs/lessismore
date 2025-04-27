import { FC, useEffect } from 'react';
import Layout from '../../Layout.tsx';
import Bottom from '../../Bottom.tsx';
import Warehouse from '../model/Warehouse.ts';
import { observer } from 'mobx-react-lite';
import WarehouseGearView from './WarehouseGearView.tsx';
import WarehouseFiltersView from './WarehouseFiltersView.tsx';
import WarehouseEditWrapperView from '../../gear-edit/component/GearEditWrapperView.tsx';
import WarehouseEmptyView from './WarehouseEmptyView';
import AddButtonView from './AddButtonView';
import UserMenu from './UserMenu';

interface Props {
  warehouse: Warehouse;
}

const WarehouseView: FC<Props> = ({ warehouse }) => {
  const gears = warehouse.getGears();
  const isEmpty = warehouse.isEmpty();

  useEffect(() => {
    warehouse.initialize();
  }, []);

  if (isEmpty) {
    return <WarehouseEmptyView />;
  } else {
    return (
      <Layout>
        <div style={{ position: 'absolute', top: 20, right: 16, zIndex: 10 }}>
          <UserMenu />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginTop: '8px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              fontWeight: '1000',
              fontSize: '48px',
              textAlign: 'center',
              display: 'inline-block',
              lineHeight: 1,
              letterSpacing: '-4.5px',
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
            paddingBottom: '53px',
          }}
        >
          <ul
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {gears.map((gear) => (
              <WarehouseGearView key={gear.getId()} gear={gear} warehouse={warehouse} />
            ))}
          </ul>
        </div>
        <AddButtonView />
        <Bottom />
        <WarehouseEditWrapperView />
      </Layout>
    );
  }
};

export default observer(WarehouseView);

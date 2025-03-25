import { FC, useEffect } from 'react';
import Layout from '../../Layout.tsx';
import Bottom from '../../Bottom.tsx';
import Warehouse from '../model/Warehouse.ts';
import { observer } from 'mobx-react-lite';
import WarehouseGearView from './WarehouseGearView.tsx';
import WarehouseFiltersView from './WarehouseFiltersView.tsx';
import CustomGear from '../custom-gear/model/CustomGear.ts';
import WarehouseEditWrapperView from '../edit/component/WarehouseEditWrapperView.tsx';
import WarehouseDetailWrapper from '../detail/component/WarehouseDetailWrapper';
import WarehouseEmptyView from './WarehouseEmptyView';
import AddButtonView from './AddButtonView';

interface Props {
  warehouse: Warehouse;
  customGear: CustomGear;
}

const WarehouseView: FC<Props> = ({ warehouse, customGear }) => {
  const gears = warehouse.getGears();
  const isEmpty = warehouse.isEmpty();

  useEffect(() => {
    warehouse.getList();
  }, []);

  if (isEmpty) {
    return <WarehouseEmptyView />;
  } else {
    return (
      <Layout>
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
              <WarehouseGearView
                key={gear.getId()}
                gear={gear}
                warehouse={warehouse}
              />
            ))}
          </ul>
        </div>
        <AddButtonView customGear={customGear} />
        <Bottom />
        <WarehouseEditWrapperView />
        <WarehouseDetailWrapper />
      </Layout>
    );
  }
};

export default observer(WarehouseView);

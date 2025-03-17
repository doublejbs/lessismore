import { FC } from 'react';
import app from '../../../App';
import { createPortal } from 'react-dom';
import { observer } from 'mobx-react-lite';
import WarehouseDetailView from './WarehouseDetailView';

const WarehouseDetailWrapper: FC = () => {
  const warehouseDetail = app.getWarehouseDetail();
  const isVisible = warehouseDetail.isVisible();
  const gear = warehouseDetail.getGear();

  if (isVisible && gear) {
    return createPortal(
      <WarehouseDetailView warehouseDetail={warehouseDetail} />,
      document.body
    );
  } else {
    return null;
  }
};

export default observer(WarehouseDetailWrapper);

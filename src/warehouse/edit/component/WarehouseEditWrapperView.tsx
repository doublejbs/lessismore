import { FC } from 'react';
import { createPortal } from 'react-dom';
import WarehouseEditView from './WarehouseEditView';
import { observer } from 'mobx-react-lite';
import app from '../../../App';

const WarehouseEditWrapperView: FC = () => {
  const warehouseEdit = app.getWarehouseEdit();
  const isVisible = warehouseEdit.isVisible();

  if (isVisible) {
    return createPortal(
      <WarehouseEditView warehouseEdit={warehouseEdit} />,
      document.body
    );
  } else {
    return null;
  }
};

export default observer(WarehouseEditWrapperView);

import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import WarehouseDetailView from './WarehouseDetailView';
import WarehouseDetail from '../model/WarehouseDetail';
import { useLocation } from 'react-router-dom';
import WarehouseDispatcher from '../../warehouse/model/WarehouseDispatcher';
import WebViewManager from '../../webview/WebViewManager';
import { useActivityParams } from '@stackflow/react';

interface Props {
  webViewManager: WebViewManager;
}

const WarehouseDetailWrapper: FC<Props> = ({ webViewManager }) => {
  const location = useLocation();
  const [warehouseDetail] = useState(() =>
    WarehouseDetail.new(WarehouseDispatcher.new(), location, webViewManager)
  );
  const { id = '' } = useActivityParams() as { id: string };
  const initialized = warehouseDetail.isInitialized();

  useEffect(() => {
    warehouseDetail.initialize(id);
  }, [id]);

  if (initialized) {
    return <WarehouseDetailView warehouseDetail={warehouseDetail} />;
  } else {
    return null;
  }
};

export default observer(WarehouseDetailWrapper);

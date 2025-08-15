import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import WarehouseDetailView from './WarehouseDetailView';
import WarehouseDetail from '../model/WarehouseDetail';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import WarehouseDispatcher from '../../warehouse/model/WarehouseDispatcher';
import WebViewManager from '../../webview/WebViewManager';

interface Props {
  webViewManager: WebViewManager;
}

const WarehouseDetailWrapper: FC<Props> = ({ webViewManager }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [warehouseDetail] = useState(() =>
    WarehouseDetail.new(navigate, WarehouseDispatcher.new(), location, webViewManager)
  );
  const { id = '' } = useParams();
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

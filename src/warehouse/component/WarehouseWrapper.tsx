import { FC, useState } from 'react';
import WarehouseView from './WarehouseView.tsx';
import Warehouse from '../model/Warehouse.ts';
import { observer } from 'mobx-react-lite';
import WarehouseDispatcher from '../model/WarehouseDispatcher.ts';
import app from '../../App';
import { AppScreen } from '@stackflow/plugin-basic-ui';
import WebViewWrapper from '../../webview/WebViewWrapper.tsx';

interface Props {}

const WarehouseWrapper: FC<Props> = () => {
  const [warehouse] = useState(() =>
    Warehouse.from(
      WarehouseDispatcher.new(),
      app.getToastManager(),
      app.getFirebase(),
      app.getWebViewManager()
    )
  );

  return (
    <AppScreen>
      <WebViewWrapper>
        <WarehouseView warehouse={warehouse} />
      </WebViewWrapper>
    </AppScreen>
  );
};

export default observer(WarehouseWrapper);

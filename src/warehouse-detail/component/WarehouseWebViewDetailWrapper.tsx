import WebViewWrapper from '../../webview/WebViewWrapper';
import WarehouseDetailWrapper from './WarehouseDetailWrapper';
import app from '../../App';
import { useState } from 'react';
import WarehouseDetailSkeletonView from './WarehouseDetailSkeletonView';
import { AppScreen } from '@stackflow/plugin-basic-ui';

const WarehouseWebViewDetailWrapper = () => {
  const [webViewManager] = useState(() => app.getWebViewManager());

  return (
    <>
      <AppScreen>
        <WebViewWrapper skeletonView={<WarehouseDetailSkeletonView isWebView={true} />}>
          <WarehouseDetailWrapper webViewManager={webViewManager} />
        </WebViewWrapper>
      </AppScreen>
    </>
  );
};

export default WarehouseWebViewDetailWrapper;

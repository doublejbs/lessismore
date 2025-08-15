import WebViewWrapper from '../../webview/WebViewWrapper';
import WarehouseDetailWrapper from './WarehouseDetailWrapper';
import app from '../../App';
import WebViewManager from '../../webview/WebViewManager';
import { useState } from 'react';
import WarehouseDetailSkeletonView from './WarehouseDetailSkeletonView';

const WarehouseWebViewDetailWrapper = () => {
  const [webViewManager] = useState(() => WebViewManager.new(app.getFirebase()));

  return (
    <WebViewWrapper
      webViewManager={webViewManager}
      skeletonView={<WarehouseDetailSkeletonView isWebView={true} />}
    >
      <WarehouseDetailWrapper webViewManager={webViewManager} />
    </WebViewWrapper>
  );
};

export default WarehouseWebViewDetailWrapper;

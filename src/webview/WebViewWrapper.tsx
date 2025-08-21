import { FC, useEffect } from 'react';
import WebViewManager from './WebViewManager';
import { observer } from 'mobx-react-lite';

interface Props {
  webViewManager: WebViewManager;
  children: React.ReactNode;
  skeletonView?: React.ReactNode;
}

const WebViewWrapper: FC<Props> = ({ children, webViewManager, skeletonView }) => {
  const initialized = webViewManager.isInitialized();

  useEffect(() => {
    webViewManager.initialize();
  }, []);

  if (initialized) {
    return <>{children}</>;
  } else {
    return skeletonView;
  }
};

export default observer(WebViewWrapper);

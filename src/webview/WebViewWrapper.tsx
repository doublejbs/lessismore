import { FC, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import app from '../App';

interface Props {
  children: React.ReactNode;
  skeletonView?: React.ReactNode;
}

const WebViewWrapper: FC<Props> = ({ children, skeletonView }) => {
  const webViewManager = app.getWebViewManager();
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

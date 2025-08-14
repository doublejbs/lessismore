import { FC, useEffect, useState } from 'react';
import WebViewManager from './WebViewManager';
import app from '../App';

interface Props {
  children: React.ReactNode;
}

const WebViewWrapper: FC<Props> = ({ children }) => {
  const [webViewManager] = useState<WebViewManager>(() => WebViewManager.new(app.getFirebase()));

  useEffect(() => {
    webViewManager.initialize();
  }, []);

  return <>{children}</>;
};

export default WebViewWrapper;

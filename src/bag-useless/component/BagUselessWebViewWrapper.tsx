import { FC, useState } from 'react';
import WebViewWrapper from '../../webview/WebViewWrapper';
import { useLocation, useNavigate } from 'react-router-dom';
import WebViewManager from '../../webview/WebViewManager';
import BagUselessView from './BagUselessView';
import BagUseless from '../model/BagUseless';
import app from '../../App';
import BagUselessSkeletonView from './BagUselessSkeletonView';

const BagUselessWebViewWrapper: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [webViewManager] = useState(() => WebViewManager.new(app.getFirebase()));
  const [bagUseless] = useState(() => BagUseless.new(navigate, location, webViewManager));

  return (
    <WebViewWrapper webViewManager={webViewManager} skeletonView={<BagUselessSkeletonView />}>
      <BagUselessView bagUseless={bagUseless} />
    </WebViewWrapper>
  );
};

export default BagUselessWebViewWrapper;

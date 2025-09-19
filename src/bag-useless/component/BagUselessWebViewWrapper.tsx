import { FC, useState } from 'react';
import WebViewWrapper from '../../webview/WebViewWrapper';
import { useLocation } from 'react-router-dom';
import BagUselessView from './BagUselessView';
import BagUseless from '../model/BagUseless';
import app from '../../App';
import BagUselessSkeletonView from './BagUselessSkeletonView';
import { AppScreen } from '@stackflow/plugin-basic-ui';

const BagUselessWebViewWrapper: FC = () => {
  const location = useLocation();
  const [webViewManager] = useState(() => app.getWebViewManager());
  const [bagUseless] = useState(() => BagUseless.new(location, webViewManager));

  return (
    <AppScreen>
      <WebViewWrapper skeletonView={<BagUselessSkeletonView />}>
        <BagUselessView bagUseless={bagUseless} />
      </WebViewWrapper>
    </AppScreen>
  );
};

export default BagUselessWebViewWrapper;

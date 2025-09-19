import { FC, useState } from 'react';
import { useLocation } from 'react-router-dom';
import BagDetail from './model/BagDetail';
import { observer } from 'mobx-react-lite';
import BagDetailView from './BagDetailView';
import BagDetailSkeletonView from './BagDetailSkeletonView';
import WebViewWrapper from '../webview/WebViewWrapper';
import app from '../App';
import { AppScreen } from '@stackflow/plugin-basic-ui';
import { useActivityParams } from '@stackflow/react';

const BagDetailWrapper: FC = () => {
  const { id } = useActivityParams() as { id: string };
  const location = useLocation();
  const [webViewManager] = useState(() => app.getWebViewManager());
  const [bagDetail] = useState(() => BagDetail.from(location, id ?? '', webViewManager));

  return (
    <AppScreen>
      <WebViewWrapper skeletonView={<BagDetailSkeletonView />}>
        <BagDetailView bagDetail={bagDetail} />
      </WebViewWrapper>
    </AppScreen>
  );
};

export default observer(BagDetailWrapper);

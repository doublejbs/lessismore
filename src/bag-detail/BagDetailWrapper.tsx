import { FC, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import BagDetail from './model/BagDetail';
import { observer } from 'mobx-react-lite';
import BagDetailView from './BagDetailView';
import BagDetailSkeletonView from './BagDetailSkeletonView';
import WebViewWrapper from '../webview/WebViewWrapper';
import WebViewManager from '../webview/WebViewManager';
import app from '../App';

const BagDetailWrapper: FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [webViewManager] = useState(() => WebViewManager.new(app.getFirebase()));
  const [bagDetail] = useState(() => BagDetail.from(navigate, location, id ?? '', webViewManager));

  return (
    <WebViewWrapper webViewManager={webViewManager} skeletonView={<BagDetailSkeletonView />}>
      <BagDetailView bagDetail={bagDetail} />
    </WebViewWrapper>
  );
};

export default observer(BagDetailWrapper);

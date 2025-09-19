import { FC, useState } from 'react';
import WebViewWrapper from '../webview/WebViewWrapper';
import app from '../App';
import BagEditView from './BagEditView';
import BagEditSkeletonView from './BagEditSkeletonView';
import { useLocation } from 'react-router-dom';
import BagEdit from './model/BagEdit';
import { useActivityParams } from '@stackflow/react';
import { AppScreen } from '@stackflow/plugin-basic-ui';

const BagEditWebViewWrapper: FC = () => {
  const [webViewManager] = useState(() => app.getWebViewManager());
  const { id = '' } = useActivityParams() as { id: string };
  const location = useLocation();
  const [bagEdit] = useState(() => BagEdit.from(location, id, webViewManager));

  return (
    <AppScreen>
      <WebViewWrapper skeletonView={<BagEditSkeletonView />}>
        <BagEditView bagEdit={bagEdit} />
      </WebViewWrapper>
    </AppScreen>
  );
};

export default BagEditWebViewWrapper;

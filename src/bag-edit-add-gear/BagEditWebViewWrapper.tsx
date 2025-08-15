import { FC, useState } from 'react';
import WebViewWrapper from '../webview/WebViewWrapper';
import WebViewManager from '../webview/WebViewManager';
import app from '../App';
import BagEditView from './BagEditView';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import BagEdit from './model/BagEdit';

const BagEditWebViewWrapper: FC = () => {
  const [webViewManager] = useState(() => WebViewManager.new(app.getFirebase()));
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [bagEdit] = useState(() => BagEdit.from(navigate, location, id, webViewManager));

  return (
    <WebViewWrapper webViewManager={webViewManager}>
      <BagEditView bagEdit={bagEdit} />
    </WebViewWrapper>
  );
};

export default BagEditWebViewWrapper;

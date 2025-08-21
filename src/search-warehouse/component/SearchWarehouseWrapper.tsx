import { FC } from 'react';
import SearchWarehouseView from './SearchWarehouseView';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import SearchWarehouse from '../model/SearchWarehouse';
import WebViewWrapper from '../../webview/WebViewWrapper';
import app from '../../App';
import WebViewManager from '../../webview/WebViewManager';
import LoadingIconView from '../../LoadingIconView';

const SearchWarehouseWrapper: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [webViewManager] = useState(() => WebViewManager.new(app.getFirebase()));
  const [searchWarehouse] = useState(() => SearchWarehouse.new(navigate, location, webViewManager));

  return (
    <WebViewWrapper
      webViewManager={webViewManager}
      skeletonView={
        <div
          style={{
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
          }}
        >
          <LoadingIconView />
        </div>
      }
    >
      <div
        style={{
          height: '100%',
        }}
      >
        <SearchWarehouseView searchWarehouse={searchWarehouse} />
      </div>
    </WebViewWrapper>
  );
};

export default SearchWarehouseWrapper;

import { FC } from 'react';
import SearchWarehouseView from './SearchWarehouseView';
import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import SearchWarehouse from '../model/SearchWarehouse';
import WebViewWrapper from '../../webview/WebViewWrapper';
import app from '../../App';
import LoadingIconView from '../../LoadingIconView';
import { AppScreen } from '@stackflow/plugin-basic-ui';

const SearchWarehouseWrapper: FC = () => {
  const location = useLocation();
  const [webViewManager] = useState(() => app.getWebViewManager());
  const [searchWarehouse] = useState(() => SearchWarehouse.new(location, webViewManager));

  return (
    <AppScreen>
      <WebViewWrapper
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
    </AppScreen>
  );
};

export default SearchWarehouseWrapper;

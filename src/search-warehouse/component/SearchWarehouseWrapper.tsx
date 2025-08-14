import { FC } from 'react';
import SearchWarehouseView from './SearchWarehouseView';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import SearchWarehouse from '../model/SearchWarehouse';
import WebViewWrapper from '../../webview/WebViewWrapper';

const SearchWarehouseWrapper: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchWarehouse] = useState(() => SearchWarehouse.new(navigate, location));

  return (
    <WebViewWrapper>
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

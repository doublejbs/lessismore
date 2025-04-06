import React, { FC, useState } from 'react';
import SearchWarehouse from '../model/SearchWarehouse';
import { observer } from 'mobx-react-lite';
import SearchBarView from './SearchBarView';
import SearchResultView from './SearchResultView';
import SearchBottomView from './SearchBottomView';
import { useLocation, useNavigate } from 'react-router-dom';

interface Props {
  children?: React.ReactNode;
}

const SearchWarehouseView: FC<Props> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchWarehouse] = useState(() => SearchWarehouse.new(navigate, location));
  const selectedCount = searchWarehouse.getSelectedCount();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        paddingTop: '80px',
        paddingBottom: selectedCount ? '185px' : '101px',
      }}
    >
      <SearchBarView searchWarehouse={searchWarehouse} />
      <SearchResultView searchWarehouse={searchWarehouse} />
      <SearchBottomView searchWarehouse={searchWarehouse} />
    </div>
  );
};

export default observer(SearchWarehouseView);

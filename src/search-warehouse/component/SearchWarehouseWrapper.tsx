import { FC } from 'react';
import SearchWarehouseView from './SearchWarehouseView';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import SearchWarehouse from '../model/SearchWarehouse';

const SearchWarehouseWrapper: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchWarehouse] = useState(() => SearchWarehouse.new(navigate, location));

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'hidden',
      }}
    >
      <SearchWarehouseView searchWarehouse={searchWarehouse} />
    </div>
  );
};

export default SearchWarehouseWrapper;

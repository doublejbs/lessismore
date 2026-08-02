import { FC } from 'react';
import SearchWarehouse from '../model/SearchWarehouse';
import SearchConfirmView from './SearchConfirmView';
import { observer } from 'mobx-react-lite';
import SearchSelectedView from './SearchSelectedView';

interface Props {
  searchWarehouse: SearchWarehouse;
}

const SearchBottomView: FC<Props> = ({ searchWarehouse }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        backgroundColor: 'white',
        gap: '4px',
        position: 'fixed',
        bottom: 0,
        left: 0,
        zIndex: 10,
      }}
    >
      <SearchSelectedView searchWarehouse={searchWarehouse} />
      <SearchConfirmView searchWarehouse={searchWarehouse} />
    </div>
  );
};

export default observer(SearchBottomView);

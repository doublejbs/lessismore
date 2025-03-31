import { FC } from 'react';
import SearchWarehouse from '../model/SearchWarehouse';
import SearchConfirmView from './SearchConfirmView';
import SearchSelectedView from './SearchSelectedView';
import { observer } from 'mobx-react-lite';

interface Props {
  searchWarehouse: SearchWarehouse;
}

const SearchBottomView: FC<Props> = ({ searchWarehouse }) => {
  const selectedCount = searchWarehouse.getSelectedCount();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: selectedCount ? '185px' : '84px',
        backgroundColor: 'white',
        gap: '4px',
      }}
    >
      <SearchSelectedView searchWarehouse={searchWarehouse} />
      <SearchConfirmView searchWarehouse={searchWarehouse} />
    </div>
  );
};

export default observer(SearchBottomView);

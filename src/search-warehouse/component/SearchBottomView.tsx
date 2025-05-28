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
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: 'fit-content',
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

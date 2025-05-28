import { FC } from 'react';
import BagEdit from './model/BagEdit';
import { observer } from 'mobx-react-lite';
import SearchResultView from '../search-warehouse/component/SearchResultView';
import SearchBottomView from '../search-warehouse/component/SearchBottomView';
import SearchBarView from '../search-warehouse/component/SearchBarView';

interface Props {
  bagEdit: BagEdit;
}

const BagEditWarehouseSearchWrapper: FC<Props> = ({ bagEdit }) => {
  const shouldShowSearch = bagEdit.isSearchVisible();
  const bagEditSearch = bagEdit.getBagEditSearch();

  if (!shouldShowSearch) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: 'white',
        height: '90%',
        position: 'relative',
        borderRadius: '10px 10px 0 0',
        zIndex: 12,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'hidden',
        paddingTop: '16px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <SearchBarView searchWarehouse={bagEditSearch} />
      <SearchResultView searchWarehouse={bagEditSearch} />
      <SearchBottomView searchWarehouse={bagEditSearch} />
    </div>
  );
};

export default observer(BagEditWarehouseSearchWrapper);

import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import SearchBarView from '../search-warehouse/component/SearchBarView';
import SearchBottomView from '../search-warehouse/component/SearchBottomView';
import SearchResultView from '../search-warehouse/component/SearchResultView';
import BagEdit from './model/BagEdit';

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
        overflowY: 'auto',
        paddingBottom: '80px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <SearchBarView searchWarehouse={bagEditSearch} />
      <SearchResultView searchWarehouse={bagEditSearch}>
        {<div style={{ minHeight: bagEditSearch.hasSelected() ? '180px' : '80px' }}></div>}
      </SearchResultView>
      <SearchBottomView searchWarehouse={bagEditSearch} />
    </div>
  );
};

export default observer(BagEditWarehouseSearchWrapper);

import { FC } from 'react';
import SearchWarehouse from '../model/SearchWarehouse';
import { observer } from 'mobx-react-lite';

interface Props {
  searchWarehouse: SearchWarehouse;
}

const SearchConfirmView: FC<Props> = ({ searchWarehouse }) => {
  const selectedCount = searchWarehouse.getSelectedCount();

  const handleClick = () => {
    searchWarehouse.register();
  };

  return (
    <div
      style={{
        width: '100%',
        padding: '12px 24px',
      }}
    >
      <button
        style={{
          width: '100%',
          padding: '18px 0',
          backgroundColor: selectedCount > 0 ? 'black' : '#D5D8DF',
          borderRadius: '10px',
          color: 'white',
          fontSize: '16px',
        }}
        onClick={handleClick}
      >
        {selectedCount > 0
          ? `${selectedCount}개 추가하기`
          : '추가할 장비를 선택해주세요'}
      </button>
    </div>
  );
};

export default observer(SearchConfirmView);

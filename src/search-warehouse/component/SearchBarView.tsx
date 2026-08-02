import { FC } from 'react';
import SearchWarehouse from '../model/SearchWarehouse';
import { observer } from 'mobx-react-lite';
import SearchBarInputView from './SearchInputView';

interface Props {
  searchWarehouse: SearchWarehouse;
}

const SearchBarView: FC<Props> = ({ searchWarehouse }) => {
  const keyword = searchWarehouse.getKeyword();

  const handleClickClear = () => {
    searchWarehouse.clearKeyword();
  };

  const handleClickBack = () => {
    searchWarehouse.back();
  };

  return (
    <div
      style={{
        paddingLeft: '10px',
        paddingRight: '20px',
        display: 'flex',
        gap: '12px',
        width: '100%',
        height: '80px',
        position: 'sticky',
        top: 0,
        left: 0,
        zIndex: 10,
        backgroundColor: 'white',
        paddingTop: '16px',
        paddingBottom: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onClick={handleClickBack}
      >
        <svg
          width='25'
          height='24'
          viewBox='0 0 25 24'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path
            d='M16.2844 20.475C15.9844 20.475 15.6844 20.375 15.4844 20.075L7.98438 12.575C7.48438 12.075 7.48438 11.375 7.98438 10.875L15.4844 3.375C15.9844 2.875 16.6844 2.875 17.1844 3.375C17.6844 3.875 17.6844 4.575 17.1844 5.075L10.3844 11.775L17.0844 18.475C17.5844 18.975 17.5844 19.675 17.0844 20.175C16.8844 20.375 16.5844 20.475 16.2844 20.475Z'
            fill='#191F28'
          />
        </svg>
      </div>
      <div
        style={{
          padding: '14px 16px',
          borderRadius: '10px',
          backgroundColor: '#F6F6F6',
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '4px',
        }}
      >
        <SearchBarInputView searchWarehouse={searchWarehouse} />
      </div>
    </div>
  );
};

export default observer(SearchBarView);

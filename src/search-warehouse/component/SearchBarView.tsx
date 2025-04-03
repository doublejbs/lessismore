import React, { FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SearchWarehouse from '../model/SearchWarehouse';
import { observer } from 'mobx-react-lite';

interface Props {
  searchWarehouse: SearchWarehouse;
}

const SearchBarView: FC<Props> = ({ searchWarehouse }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const keyword = searchWarehouse.getKeyword();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    searchWarehouse.changeKeyword(e.target.value);
  };

  const handleClickClear = () => {
    searchWarehouse.clearKeyword();
  };

  const handleClickBack = () => {
    const state = location.state as { from?: string };
    const fromPath = state?.from;
  
    if (fromPath && (fromPath.includes('/warehouse') || fromPath.includes('/bag'))) {
      navigate(-1);
    } else {
      navigate('/warehouse');
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: '16px',
        paddingLeft: '10px',
        paddingRight: '20px',
        display: 'flex',
        gap: '12px',
        width: '100%',
        height: '48px',
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
          width="25"
          height="24"
          viewBox="0 0 25 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16.2844 20.475C15.9844 20.475 15.6844 20.375 15.4844 20.075L7.98438 12.575C7.48438 12.075 7.48438 11.375 7.98438 10.875L15.4844 3.375C15.9844 2.875 16.6844 2.875 17.1844 3.375C17.6844 3.875 17.6844 4.575 17.1844 5.075L10.3844 11.775L17.0844 18.475C17.5844 18.975 17.5844 19.675 17.0844 20.175C16.8844 20.375 16.5844 20.475 16.2844 20.475Z"
            fill="#191F28"
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
        <input
          style={{
            border: 'none',
            backgroundColor: 'transparent',
            padding: 0,
            width: '100%',
            fontSize: '16px',
          }}
          value={keyword}
          onChange={handleChange}
          placeholder={'제품 혹은 브랜드 명으로 검색해보세요'}
        />
        {keyword && (
          <div onClick={handleClickClear}>
            <svg
              width="21"
              height="20"
              viewBox="0 0 21 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="0.609375"
                width="20"
                height="20"
                rx="10"
                fill="#B0B8C1"
              />
              <path
                d="M10.6107 11.1667L8.17997 13.6042C8.0263 13.7569 7.83073 13.8333 7.59324 13.8333C7.35575 13.8333 7.16018 13.7569 7.00651 13.6042C6.85373 13.4514 6.77734 13.2569 6.77734 13.0208C6.77734 12.7847 6.85373 12.5903 7.00651 12.4375L9.44401 10L7.00651 7.59017C6.85373 7.43649 6.77734 7.2409 6.77734 7.00342C6.77734 6.76592 6.85373 6.57033 7.00651 6.41667C7.15929 6.26389 7.35373 6.1875 7.58984 6.1875C7.82595 6.1875 8.0204 6.26389 8.17318 6.41667L10.6107 8.85417L13.0205 6.41667C13.1742 6.26389 13.3698 6.1875 13.6073 6.1875C13.8448 6.1875 14.0403 6.26389 14.194 6.41667C14.3607 6.58333 14.444 6.78125 14.444 7.01042C14.444 7.23958 14.3607 7.43056 14.194 7.58333L11.7565 10L14.194 12.4307C14.3468 12.5844 14.4232 12.78 14.4232 13.0174C14.4232 13.2549 14.3468 13.4505 14.194 13.6042C14.0273 13.7708 13.8294 13.8542 13.6003 13.8542C13.3711 13.8542 13.1801 13.7708 13.0273 13.6042L10.6107 11.1667Z"
                fill="white"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default observer(SearchBarView);

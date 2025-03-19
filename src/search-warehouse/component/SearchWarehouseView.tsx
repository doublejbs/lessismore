import React, { FC, useState } from 'react';
import { debounce } from 'lodash';
import SearchWarehouse from '../model/SearchWarehouse';
import InfinityScroll from './InfinityScroll';
import SearchGearView from './SearchGearView';
import LoadingView from '../../LoadingView';
import { observer } from 'mobx-react-lite';

interface Props {
  children?: React.ReactNode;
}

const SearchWarehouseView: FC<Props> = () => {
  const [searchWarehouse] = useState(() => SearchWarehouse.new());
  const result = searchWarehouse.getResult();
  const isLoading = searchWarehouse.isLoading();
  const keyword = searchWarehouse.getKeyword();
  const isEmpty = searchWarehouse.isEmpty();
  const canLoadMore = searchWarehouse.canLoadMore();

  const handleChange = debounce((e: React.ChangeEvent<HTMLInputElement>) => {
    searchWarehouse.search(e.target.value);
  }, 200);

  const handleLoadMore = () => {
    searchWarehouse.searchMore();
  };

  const render = () => {
    switch (true) {
      case !keyword.length: {
        return <div>검색어를 입력해주세요</div>;
      }
      case isEmpty && !isLoading: {
        return <div>검색 결과가 없습니다</div>;
      }
      default: {
        return (
          <div
            style={{
              height: '100%',
              overflowY: 'auto',
              transform: 'translateZ(0)',
              paddingBottom: '56px',
            }}
          >
            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <InfinityScroll
                loadMore={handleLoadMore}
                isLoading={isLoading}
                hasMore={canLoadMore}
              >
                {result.map((gear) => (
                  <SearchGearView
                    key={gear.getId()}
                    gear={gear}
                    searchWarehouse={searchWarehouse}
                  />
                ))}
              </InfinityScroll>
            </ul>
            {isLoading && (
              <div
                style={{
                  height: '100%',
                }}
              >
                <LoadingView />
              </div>
            )}
          </div>
        );
      }
    }
  };

  return (
    <>
      <div
        style={{
          width: '100%',
          backgroundColor: 'white',
          zIndex: 10,
        }}
      >
        <input
          style={{
            width: '100%',
            borderRadius: '5px',
            backgroundColor: '#F1F1F1',
            border: 'none',
            zIndex: 10,
          }}
          type="text"
          placeholder="제품 혹은 브랜드명으로 검색해보세요"
          onChange={handleChange}
        />
      </div>
      {render()}
    </>
  );
};

export default observer(SearchWarehouseView);

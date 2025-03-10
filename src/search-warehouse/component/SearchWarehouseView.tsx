import React, { FC, useEffect, useState } from 'react';
import SearchWarehouse from '../model/SearchWarehouse';
import SearchGearView from './SearchGearView';
import Layout from '../../Layout';
import Bottom from '../../Bottom';
import LoadingView from '../../LoadingView.tsx';
import { debounce } from 'lodash';
import { observer } from 'mobx-react-lite';
import InfinityScroll from './InfinityScroll.tsx';

interface Props {}

const SearchWarehouseView: FC<Props> = () => {
  const [searchWarehouse] = useState(() => SearchWarehouse.new());
  const result = searchWarehouse.getResult();
  const isLoading = searchWarehouse.isLoading();

  const handleChange = debounce((e: React.ChangeEvent<HTMLInputElement>) => {
    searchWarehouse.search(e.target.value);
  }, 200);

  const handleLoadMore = () => {
    searchWarehouse.searchMore();
  };

  useEffect(() => {
    searchWarehouse.search('');
  }, []);

  return (
    <Layout>
      <div
        style={{
          paddingTop: '56px',
        }}
      >
        <div
          style={{
            width: '100%',
            position: 'fixed',
            top: 0,
            left: 0,
            padding: '16px 16px 0 16px',
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
            }}
            type="text"
            placeholder="제품 혹은 브랜드명으로 검색해보세요"
            onChange={handleChange}
          />
        </div>

        <div
          style={{
            height: '100%',
            overflowY: 'auto',
            marginBottom: '54px',
            transform: 'translateZ(0)',
          }}
        >
          <ul
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <InfinityScroll loadMore={handleLoadMore} isLoading={isLoading}>
              {result.map((gear) => (
                <SearchGearView
                  key={gear.getId()}
                  gear={gear}
                  searchWarehouse={searchWarehouse}
                />
              ))}
            </InfinityScroll>
          </ul>
        </div>
      </div>
      <Bottom />
    </Layout>
  );
};

export default observer(SearchWarehouseView);

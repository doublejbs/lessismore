import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import LoadingView from '../../LoadingView';
import SearchWarehouse from '../model/SearchWarehouse';
import InfinityScroll from './InfinityScroll';
import SearchGearView from './SearchGearView';

interface Props {
  searchWarehouse: SearchWarehouse;
}

const SearchResultView: FC<Props> = ({ searchWarehouse }) => {
  const keyword = searchWarehouse.getKeyword();
  const isEmpty = searchWarehouse.isEmpty();
  const canLoadMore = searchWarehouse.canLoadMore();
  const isLoading = searchWarehouse.isLoading();
  const result = searchWarehouse.getResult();

  const handleLoadMore = () => {
    searchWarehouse.searchMore();
  };

  const render = () => {
    switch (true) {
      case !keyword.length: {
        return <div></div>;
      }
      case isEmpty && !isLoading: {
        return <div>검색 결과가 없습니다</div>;
      }
      default: {
        return (
          <>
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
          </>
        );
      }
    }
  };

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        transform: 'translateZ(0)',
        padding: '0 20px',
      }}
    >
      {render()}
    </div>
  );
};

export default observer(SearchResultView);

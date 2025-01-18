import React, { FC, useEffect, useState } from 'react';
import SearchWarehouse from './SearchWarehouse';
import { observer } from 'mobx-react-lite';
import SearchGearView from './SearchGearView';
import Layout from '../Layout';
import Bottom from '../Bottom';

interface Props {}

const SearchWarehouseView: FC<Props> = () => {
  const [searchWarehouse] = useState(() => SearchWarehouse.new());
  const result = searchWarehouse.getResult();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    searchWarehouse.search(e.target.value);
  };

  useEffect(() => {
    searchWarehouse.getAll();
  }, []);

  return (
    <>
      <Layout>
        <div
          style={{
            width: '100%',
            padding: '10px',
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
          }}
        >
          <ul
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {result.map((gear) => (
              <SearchGearView
                key={gear.getId()}
                gear={gear}
                searchWarehouse={searchWarehouse}
              />
            ))}
          </ul>
        </div>
        <Bottom />
      </Layout>
    </>
  );
};

export default observer(SearchWarehouseView);

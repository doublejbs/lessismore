import React, { FC, InputHTMLAttributes, useEffect, useState } from 'react';
import Layout from '../Layout';
import SearchWarehouse from './SearchWarehouse';
import { observer } from 'mobx-react-lite';
import GearView from './GearView';

interface Props {
  hideAdd: () => void;
}

const AddWarehouse: FC<Props> = ({ hideAdd }) => {
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
            width: '100%',
            height: '48px',
            padding: '0 10px',
          }}
        >
          <button
            style={{
              width: '100%',
              backgroundColor: '#F1F1F1',
              height: '100%',
            }}
          >
            나만의 제품 추가하기
          </button>
        </div>
        <div
          style={{
            height: '100%',
          }}
        >
          <ul
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {result.map((gear) => (
              <GearView key={gear.id} gear={gear} />
            ))}
          </ul>
        </div>
        <div
          style={{
            position: 'fixed',
            bottom: '10px',
            width: '90%',
            padding: '10px',
            textAlign: 'center',
            backgroundColor: 'black',
            color: 'white',
            left: '50%',
            transform: 'translateX(-50%)',
            borderRadius: '10px',
          }}
          onClick={hideAdd}
        >
          <button>확인</button>
        </div>
      </Layout>
    </>
  );
};

export default observer(AddWarehouse);

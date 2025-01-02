import React, { FC, useState } from 'react';
import Layout from '../../Layout.tsx';
import CustomGear from './CustomGear.ts';
import { observer } from 'mobx-react-lite';
import Warehouse from '../Warehouse.ts';
import ImageUploadView from './ImageUploadView.tsx';
import LoadingIconView from '../../LoadingIconView.tsx';

interface Props {
  warehouse: Warehouse;
}

const CustomGearView: FC<Props> = ({ warehouse }) => {
  const [customGear] = useState(() => CustomGear.new());
  const name = customGear.getName();
  const company = customGear.getCompany();
  const weight = customGear.getWeight();
  const isLoading = customGear.isLoading();

  const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    customGear.setName(e.target.value);
  };

  const handleChangeCompany = (e: React.ChangeEvent<HTMLInputElement>) => {
    customGear.setCompany(e.target.value);
  };

  const handleChangeWeight = (e: React.ChangeEvent<HTMLInputElement>) => {
    customGear.setWeight(Number(e.target.value));
  };

  const handleClickConfirm = async () => {
    await customGear.register();
    warehouse.hideCustom();
  };

  return (
    <Layout>
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
          }}
        >
          <LoadingIconView />
        </div>
      )}
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <span>제품명</span>
        <input
          style={{
            borderRadius: '5px',
            backgroundColor: 'lightgray',
            border: 'none',
          }}
          onChange={handleChangeName}
          value={name}
        />
      </div>
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <span>브랜드</span>
        <input
          style={{
            borderRadius: '5px',
            backgroundColor: 'lightgray',
            border: 'none',
          }}
          onChange={handleChangeCompany}
          value={company}
        />
      </div>
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <span>무게</span>
        <input
          style={{
            borderRadius: '5px',
            backgroundColor: 'lightgray',
            border: 'none',
          }}
          onChange={handleChangeWeight}
          value={weight}
        />
      </div>
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <span>이미지</span>
        <ImageUploadView customGear={customGear} />
      </div>
      <div
        style={{
          position: 'fixed',
          bottom: '10px',
          width: '100%',
          textAlign: 'center',
          backgroundColor: 'black',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
        }}
      >
        <button
          style={{
            width: '100%',
          }}
          onClick={handleClickConfirm}
        >
          확인
        </button>
      </div>
    </Layout>
  );
};

export default observer(CustomGearView);

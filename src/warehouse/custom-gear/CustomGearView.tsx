import React, { FC, useState } from 'react';
import Layout from '../../Layout.tsx';
import CustomGear from './CustomGear.ts';
import { observer } from 'mobx-react-lite';
import Warehouse from '../Warehouse.ts';
import ImageUploadView from './ImageUploadView.tsx';
import LoadingIconView from '../../LoadingIconView.tsx';
import CustomGearConfirmView from './CustomGearConfirmView.tsx';

interface Props {
  customGear: CustomGear;
}

const CustomGearView: FC<Props> = ({ customGear }) => {
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
    const trimmedValue = e.target.value.trim();

    if (trimmedValue.length) {
      const number = parseFloat(trimmedValue.replace(/[^0-9.-]/g, ''));

      if (isNaN(number)) {
        return;
      } else {
        customGear.setWeight(String(number));
      }
    } else {
      customGear.setWeight(trimmedValue);
    }
  };

  const handleClickHide = () => {
    customGear.hide();
  };

  return (
    <Layout>
      <div
        style={{
          position: 'fixed',
          left: '16px',
          top: '16px',
        }}
      >
        <button onClick={handleClickHide}>닫기</button>
      </div>
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
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '100%',
            textAlign: 'center',
            padding: '8px',
          }}
        >
          커스텀 장비 추가하기
        </div>
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
            height: '80px',
            alignItems: 'center',
          }}
        >
          <ImageUploadView customGear={customGear} />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
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
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
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
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
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
            type={'number'}
          />
        </div>
      </div>
      <CustomGearConfirmView customGear={customGear} />
    </Layout>
  );
};

export default observer(CustomGearView);

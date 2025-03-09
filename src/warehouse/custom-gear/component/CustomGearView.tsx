import React, { FC } from 'react';
import { observer } from 'mobx-react-lite';
import ImageUploadView from './ImageUploadView.tsx';
import CustomGearConfirmView from './CustomGearConfirmView.tsx';
import Layout from '../../../Layout';
import CustomGear from '../model/CustomGear';
import LoadingIconView from '../../../LoadingIconView';
import WarehouseFilter from '../../WarehouseFilter';
import CustomGearWeightView from './CustomGearWeightView';

interface Props {
  customGear: CustomGear;
}

const CustomGearView: FC<Props> = ({ customGear }) => {
  const name = customGear.getName();
  const company = customGear.getCompany();
  const isLoading = customGear.isLoading();

  const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    customGear.setName(e.target.value);
  };

  const handleChangeCompany = (e: React.ChangeEvent<HTMLInputElement>) => {
    customGear.setCompany(e.target.value);
  };

  const handleClickHide = () => {
    customGear.hide();
  };

  const handleClickSelectFilter = (filter: WarehouseFilter) => {
    customGear.selectFilter(filter);
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
            placeholder={'제품명을 입력해주세요'}
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
            placeholder={'브랜드를 입력해주세요'}
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
          <span>카테고리</span>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {customGear.mapFilters((filter) => {
              return (
                <button
                  style={{
                    backgroundColor: filter.isSelected() ? 'black' : '#F1F1F1',
                    color: filter.isSelected() ? 'white' : 'black',
                    borderRadius: '16px',
                    padding: '8px 16px',
                    fontSize: '14px',
                  }}
                  key={filter.getFilter()}
                  onClick={() => handleClickSelectFilter(filter)}
                >
                  {filter.getName()}
                </button>
              );
            })}
          </div>
        </div>
        <CustomGearWeightView customGear={customGear} />
      </div>
      <CustomGearConfirmView customGear={customGear} />
    </Layout>
  );
};

export default observer(CustomGearView);

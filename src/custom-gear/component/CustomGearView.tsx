import React, { FC } from 'react';
import { observer } from 'mobx-react-lite';
import ImageUploadView from './ImageUploadView.tsx';
import CustomGearConfirmView from './CustomGearConfirmView.tsx';
import CustomGear from '../model/CustomGear';
import LoadingIconView from '../../LoadingIconView';
import WarehouseFilter from '../../warehouse/model/WarehouseFilter.ts';
import CustomGearWeightView from './CustomGearWeightView';
import CustomGearColorView from './CustomGearColorView';
import { useFlow } from '@stackflow/react/future';

interface Props {
  customGear: CustomGear;
}

const CustomGearView: FC<Props> = ({ customGear }) => {
  const name = customGear.getName();
  const company = customGear.getCompany();
  const isLoading = customGear.isLoading();
  const { pop } = useFlow();

  const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    customGear.setName(e.target.value);
  };

  const handleChangeCompany = (e: React.ChangeEvent<HTMLInputElement>) => {
    customGear.setCompany(e.target.value);
  };

  const handleClickHide = () => {
    customGear.hide(pop);
  };

  const handleClickSelectFilter = (filter: WarehouseFilter) => {
    customGear.selectFilter(filter);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        padding: '0 20px 20px 20px',
        overflowY: 'hidden',
        gap: '16px',
      }}
    >
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
          backgroundColor: 'white',
          position: 'relative',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <button
          style={{
            height: '41px',
          }}
          onClick={handleClickHide}
        >
          <svg
            width='11'
            height='18'
            viewBox='0 0 11 18'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M9.28437 17.475C8.98437 17.475 8.68437 17.375 8.48438 17.075L0.984375 9.575C0.484375 9.075 0.484375 8.375 0.984375 7.875L8.48438 0.375C8.98438 -0.125 9.68438 -0.125 10.1844 0.375C10.6844 0.875 10.6844 1.575 10.1844 2.075L3.38437 8.775L10.0844 15.475C10.5844 15.975 10.5844 16.675 10.0844 17.175C9.88438 17.375 9.58437 17.475 9.28437 17.475Z'
              fill='#191F28'
            />
          </svg>
        </button>
        <div
          style={{
            width: '100%',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          직접 작성하기
        </div>
        <div style={{ width: '10px' }}></div>
      </div>
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',

          paddingBottom: '84px',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
            height: '80px',
            alignItems: 'center',
          }}
        >
          <ImageUploadView fileUpload={customGear} />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <span
            style={{
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            제품명
          </span>
          <input
            style={{
              borderRadius: '10px',
              backgroundColor: '#F6F6F6',
              border: 'none',
              padding: '16px',
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
            gap: '12px',
          }}
        >
          <span
            style={{
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            브랜드
          </span>
          <input
            style={{
              borderRadius: '10px',
              backgroundColor: '#F6F6F6',
              border: 'none',
              padding: '16px',
            }}
            placeholder={'브랜드를 입력해주세요'}
            onChange={handleChangeCompany}
            value={company}
          />
        </div>
        <CustomGearColorView customGear={customGear} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <span
            style={{
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            카테고리
          </span>
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
                    backgroundColor: filter.isSelected() ? 'black' : '#F6F6F6',
                    color: filter.isSelected() ? 'white' : 'black',
                    borderRadius: '20px',
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
    </div>
  );
};

export default observer(CustomGearView);

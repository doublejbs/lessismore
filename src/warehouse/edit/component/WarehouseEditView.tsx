import React, { FC } from 'react';
import LoadingIconView from '../../../LoadingIconView';
import { observer } from 'mobx-react-lite';
import WarehouseEdit from '../model/WarehouseEdit';
import ImageUploadView from '../../custom-gear/component/ImageUploadView';
import WarehouseFilter from '../../model/WarehouseFilter.ts';
import WarehouseEditWeightView from './WarehouseEditWeightView';
import WarehouseEditConfirmView from './WarehouseEditConfirmView';

interface Props {
  warehouseEdit: WarehouseEdit;
}

const WarehouseEditView: FC<Props> = ({ warehouseEdit }) => {
  const isLoading = warehouseEdit.isLoading();
  const name = warehouseEdit.getName();
  const company = warehouseEdit.getCompany();

  const handleChangeCompany = (e: React.ChangeEvent<HTMLInputElement>) => {
    warehouseEdit.setCompany(e.target.value);
  };

  const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    warehouseEdit.setName(e.target.value);
  };

  const handleClickSelectFilter = (filter: WarehouseFilter) => {
    warehouseEdit.selectFilter(filter);
  };

  return (
    <div
      style={{
        zIndex: 10,
        backgroundColor: 'white',
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            width: '100%',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '20px',
          }}
        >
          장비 정보 수정하기
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
          <ImageUploadView fileUpload={warehouseEdit} />
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
              backgroundColor: '#F1F1F1',
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
              backgroundColor: '#F1F1F1',
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
            {warehouseEdit.mapFilters((filter) => {
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
        <WarehouseEditWeightView warehouseEdit={warehouseEdit} />
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
      <WarehouseEditConfirmView warehouseEdit={warehouseEdit} />
    </div>
  );
};

export default observer(WarehouseEditView);

import React, { FC, useEffect } from 'react';
import LoadingIconView from '../../LoadingIconView';
import { observer } from 'mobx-react-lite';
import GearEdit from '../model/GearEdit';
import ImageUploadView from '../../custom-gear/component/ImageUploadView';
import WarehouseFilter from '../../warehouse/model/WarehouseFilter.ts';
import Layout from '../../Layout';
import GearEditWeightView from './GearEditWeightView';
import GearEditConfirmView from './GearEditConfirmView';
import GearEditColorView from './GearEditColorView';
import { useActivityParams } from '@stackflow/react';
import { useFlow } from '@stackflow/react/future';

interface Props {
  gearEdit: GearEdit;
}

const GearEditView: FC<Props> = ({ gearEdit }) => {
  const name = gearEdit.getName();
  const company = gearEdit.getCompany();
  const isLoading = gearEdit.isLoading();
  const { id = '' } = (useActivityParams() as { id: string }) || { id: '' };
  const { pop } = useFlow();

  const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    gearEdit.setName(e.target.value);
  };

  const handleChangeCompany = (e: React.ChangeEvent<HTMLInputElement>) => {
    gearEdit.setCompany(e.target.value);
  };

  const handleClickHide = () => {
    pop();
  };

  const handleClickSelectFilter = (filter: WarehouseFilter) => {
    gearEdit.selectFilter(filter);
  };

  useEffect(() => {
    if (id) {
      gearEdit.initialize(id);
    }
  }, [id]);

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
          position: 'fixed',
          left: 0,
          top: 0,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          height: '41px',
          padding: '8px 20px',
          backgroundColor: 'white',
          zIndex: 20,
        }}
      >
        <button
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            height: '41px',
            padding: '8px 20px',
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
            textAlign: 'center',
            fontWeight: 'bold',
          }}
        >
          수정하기
        </div>
      </div>
      <div
        style={{
          width: '100%',
          minHeight: '57px',
        }}
      ></div>
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
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
            height: '80px',
            alignItems: 'center',
          }}
        >
          <ImageUploadView fileUpload={gearEdit} />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
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
              padding: '12px',
              boxShadow: 'none',
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
            gap: '6px',
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
              padding: '12px',
              boxShadow: 'none',
            }}
            placeholder={'브랜드를 입력해주세요'}
            onChange={handleChangeCompany}
            value={company}
          />
        </div>
        <GearEditColorView gearEdit={gearEdit} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
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
              gap: '4px',
            }}
          >
            {gearEdit.mapFilters((filter) => {
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
        <GearEditWeightView gearEdit={gearEdit} />
      </div>
      <div
        style={{
          width: '100%',
          minHeight: '80px',
        }}
      ></div>
      <GearEditConfirmView gearEdit={gearEdit} />
    </Layout>
  );
};

export default observer(GearEditView);

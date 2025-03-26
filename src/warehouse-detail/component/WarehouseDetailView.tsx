import React, { FC } from 'react';
import WarehouseDetail from '../model/WarehouseDetail';
import WarehouseDetailInformationView from './WarehouseDetailInformationView';
import WarehouseDetailBagRecordView from './WarehouseDetailBagRecordView';

interface Props {
  warehouseDetail: WarehouseDetail;
}

const WarehouseDetailView: FC<Props> = ({ warehouseDetail }) => {
  const gear = warehouseDetail.getGear();

  if (gear) {
    const handleClickClose = () => {
      warehouseDetail.close();
    };

    const handleClickDelete = () => {
      warehouseDetail.delete(gear);
    };

    const handleClickEdit = () => {
      warehouseDetail.edit();
    };

    return (
      <>
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '7px 20px',
            position: 'fixed',
          }}
        >
          <button onClick={handleClickClose}>
            <svg
              width="25"
              height="24"
              viewBox="0 0 25 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16.2844 20.475C15.9844 20.475 15.6844 20.375 15.4844 20.075L7.98438 12.575C7.48438 12.075 7.48438 11.375 7.98438 10.875L15.4844 3.375C15.9844 2.875 16.6844 2.875 17.1844 3.375C17.6844 3.875 17.6844 4.575 17.1844 5.075L10.3844 11.775L17.0844 18.475C17.5844 18.975 17.5844 19.675 17.0844 20.175C16.8844 20.375 16.5844 20.475 16.2844 20.475Z"
                fill="#191F28"
              />
            </svg>
          </button>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '0 20px',
            marginTop: '46px',
            paddingBottom: '100px',
          }}
        >
          <WarehouseDetailInformationView gear={gear} />
          <WarehouseDetailBagRecordView
            gear={gear}
            warehouseDetail={warehouseDetail}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '16px',
              position: 'fixed',
              bottom: 0,
              width: '100%',
              left: 0,
              padding: '12px 24px',
              backgroundColor: 'white',
            }}
          >
            <button
              style={{
                width: '100%',
                backgroundColor: '#F1F1F1',
                borderRadius: '10px',
                padding: '18px',
              }}
              onClick={handleClickDelete}
            >
              삭제하기
            </button>
            <button
              style={{
                width: '100%',
                backgroundColor: 'black',
                borderRadius: '10px',
                padding: '18px',
                color: 'white',
              }}
              onClick={handleClickEdit}
            >
              수정하기
            </button>
          </div>
        </div>
      </>
    );
  }
};

export default WarehouseDetailView;

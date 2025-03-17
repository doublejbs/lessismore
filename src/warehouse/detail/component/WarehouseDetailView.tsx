import React, { FC } from 'react';
import GearImageView from '../../component/GearImageView';
import WarehouseDetail from '../model/WarehouseDetail';

interface Props {
  warehouseDetail: WarehouseDetail;
}

const WarehouseDetailView: FC<Props> = ({ warehouseDetail }) => {
  const gear = warehouseDetail.getGear();

  if (gear) {
    const imageUrl = gear.getImageUrl();
    const company = gear.getCompany();
    const name = gear.getName();
    const weight = gear.getWeight();
    const useless = gear.getUseless();

    const handleClickClose = () => {
      warehouseDetail.hide();
    };

    const handleClickEdit = () => {
      warehouseDetail.edit();
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
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto',
          }}
        >
          <div>
            <GearImageView imageUrl={imageUrl} />
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: '16px',
            }}
          >
            <span>{company}</span>
            <span
              style={{
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              {name}
            </span>
          </div>
          <div>
            <span
              style={{
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              {weight}g
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span
              style={{
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              배낭 기록
            </span>
            <span
              style={{
                fontSize: '16px',
              }}
            >
              useless {useless.length}회
            </span>
            <ul>
              {warehouseDetail.mapBags((bag) => {
                return (
                  <li
                    key={bag.getID()}
                    style={{
                      display: 'flex',
                      gap: '8px',
                      borderTop: '1px solid #F1F1F1',
                      padding: '4px 0',
                    }}
                  >
                    <span>{bag.getName()}</span>

                    {gear.hasUseless(bag.getID()) ? (
                      <div style={{}}>useless</div>
                    ) : (
                      <div>used</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <button
            style={{
              width: '100%',
              backgroundColor: '#F1F1F1',
              padding: '8px 0',
              borderRadius: '8px',
            }}
            onClick={handleClickClose}
          >
            닫기
          </button>
          <button
            style={{
              width: '100%',
              backgroundColor: 'black',
              padding: '8px 0',
              borderRadius: '8px',
              color: 'white',
            }}
            onClick={handleClickEdit}
          >
            수정
          </button>
        </div>
      </div>
    );
  }
};

export default WarehouseDetailView;

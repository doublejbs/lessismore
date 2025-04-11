import React, { FC } from 'react';
import Gear from '../../model/Gear';
import WarehouseDetail from '../model/WarehouseDetail';
import { useNavigate } from 'react-router-dom';

interface Props {
  gear: Gear;
  warehouseDetail: WarehouseDetail;
}

const WarehouseDetailBagRecordView: FC<Props> = ({ gear, warehouseDetail }) => {
  const bagCount = gear.getBagCount();
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        paddingTop: '24px',
      }}
    >
      <div>
        <span
          style={{
            fontWeight: 'bold',
            fontSize: '17px',
          }}
        >
          배낭 기록 {bagCount}회
        </span>
      </div>
      <div style={{}}>
        <ul
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {warehouseDetail.mapBags((bag) => {
            const isUseless = gear.hasUseless(bag.getID());
            const isUsed = gear.hasUsed(bag.getID());

            const handleClick = () => {
              navigate(`/bag/${bag.getID()}`);
            };

            const renderButton = () => {
              if (isUseless) {
                return (
                  <button
                    style={{
                      fontSize: '11px',
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      padding: '4px 12px',
                      color: '#505967',
                    }}
                  >
                    USELESS
                  </button>
                );
              } else if (isUsed) {
                return (
                  <button
                    style={{
                      fontSize: '11px',
                      backgroundColor: '#5F5F5F',
                      borderRadius: '12px',
                      padding: '4px 12px',
                      color: 'white',
                    }}
                  >
                    USED
                  </button>
                );
              } else {
                return (
                  <div
                    style={{
                      color: '#9BA2AD',
                      fontSize: '11px',
                    }}
                  >
                    사용 여부를 입력해주세요
                  </div>
                );
              }
            };

            return (
              <li
                key={bag.getID()}
                style={{
                  padding: '14px 20px',
                  backgroundColor: '#F3F3F3',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
                onClick={handleClick}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                    }}
                  >
                    {bag.getName()}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#757C86',
                    }}
                  >
                    {bag.getEditDate()}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {renderButton()}
                  <div>
                    <svg
                      width='24'
                      height='25'
                      viewBox='0 0 24 25'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <g clip-path='url(#clip0_390_5729)'>
                        <path
                          d='M8.58984 16.922L13.1698 12.332L8.58984 7.74203L9.99984 6.33203L15.9998 12.332L9.99984 18.332L8.58984 16.922Z'
                          fill='#505967'
                        />
                      </g>
                      <defs>
                        <clipPath id='clip0_390_5729'>
                          <rect
                            width='24'
                            height='24'
                            fill='white'
                            transform='translate(0 0.332031)'
                          />
                        </clipPath>
                      </defs>
                    </svg>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default WarehouseDetailBagRecordView;

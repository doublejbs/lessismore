import { FC, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import BagUseless from '../model/BagUseless';
import { observer } from 'mobx-react-lite';
import BagUselessGearView from './BagUselessGearView';

const BagUselessView: FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [bagUseless] = useState(() => BagUseless.new(navigate, location));
  const isInitialized = bagUseless.isInitialized();
  const allCount = bagUseless.getAllCount();
  const selectedCount = bagUseless.getSelectedCount();
  const gears = bagUseless.getGears();

  const handleClickToggleSelectAll = () => {
    bagUseless.toggleSelectAll();
  };

  const handleClickConfirm = () => {
    bagUseless.save();
  };

  const handleClickBack = () => {
    bagUseless.back();
  };

  useEffect(() => {
    if (id) {
      bagUseless.initialize(id);
    }
  }, [id]);

  if (isInitialized) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'hidden',
          height: '100%',
          padding: '0 20px',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            padding: '7px 0',
          }}
        >
          <div onClick={handleClickBack}>
            <svg
              width='25'
              height='24'
              viewBox='0 0 25 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M16.2844 20.475C15.9844 20.475 15.6844 20.375 15.4844 20.075L7.98438 12.575C7.48438 12.075 7.48438 11.375 7.98438 10.875L15.4844 3.375C15.9844 2.875 16.6844 2.875 17.1844 3.375C17.6844 3.875 17.6844 4.575 17.1844 5.075L10.3844 11.775L17.0844 18.475C17.5844 18.975 17.5844 19.675 17.0844 20.175C16.8844 20.375 16.5844 20.475 16.2844 20.475Z'
                fill='#191F28'
              />
            </svg>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: '28px',
            fontWeight: 'bold',
          }}
        >
          <span>실제로 사용했던 장비만</span>
          <span>선택해주세요</span>
        </div>
        <div
          style={{
            display: 'flex',
            paddingTop: '24px',
            flexDirection: 'column',
            height: '100%',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '16px',
            }}
          >
            <div
              style={{
                fontWeight: 'bold',
              }}
            >
              전채 {allCount}개 중{' '}
              <span
                style={{
                  color: '#CCF124',
                }}
              >
                {selectedCount}
              </span>
              개 사용
            </div>
            <button
              style={{
                color: '#505967',
              }}
              onClick={handleClickToggleSelectAll}
            >
              {selectedCount ? '전체 해제' : '전체 선택'}
            </button>
          </div>
          <ul
            style={{
              height: '100%',
              overflowY: 'auto',
            }}
          >
            {gears.map((gear) => {
              return <BagUselessGearView key={gear.getId()} gear={gear} bagUseless={bagUseless} />;
            })}
          </ul>
          <div
            style={{
              width: '100%',
              padding: '12px 0',
            }}
          >
            <button
              style={{
                width: '100%',
                textAlign: 'center',
                backgroundColor: 'black',
                color: 'white',
                padding: '18px 0',
                borderRadius: '10px',
              }}
              onClick={handleClickConfirm}
            >
              완료
            </button>
          </div>
        </div>
      </div>
    );
  } else {
    return null;
  }
};

export default observer(BagUselessView);

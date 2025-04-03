import { useLocation, useNavigate } from 'react-router-dom';
import { FC, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import BagEdit from '../model/BagEdit';
import BagEditGearView from './BagEditGearView';

interface Props {
  bagEdit: BagEdit;
}

const BagEditView: FC<Props> = ({ bagEdit }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialized = bagEdit.isInitialized();

  const handleClickAdd = () => {
    navigate(`/bag/${bagEdit.getId()}/edit`);
  };

  const handleClickBack = () => {
    const state = location.state as { from?: string };
    const fromPath = state?.from;

    if (fromPath && fromPath.includes('/bag')) {
      navigate(-1);
    } else {
      navigate('/bag');
    }
  };

  const handleClickUseless = () => {
    navigate(`/bag/${bagEdit.getId()}/useless`, { state: { from: '/bag' } });
  };

  useEffect(() => {
    bagEdit.initialize();
  }, []);

  if (initialized) {
    const name = bagEdit.getName();
    const weight = bagEdit.getWeight();
    const gears = bagEdit.getGears();
    const editDate = bagEdit.getEditDate().format('YYYY.M.DD');

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'hidden',
          height: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            width: '100%',
            backgroundColor: 'white',
            paddingTop: '16px',
            zIndex: 20,
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                position: 'absolute',
                left: '20px',
                top: '20px',
              }}
              onClick={handleClickBack}
            >
              <svg
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path d='M15 5L8 12L15 19' stroke='black' strokeWidth='2' strokeLinejoin='round' />
              </svg>
            </div>
            <div
              style={{
                width: '100%',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '20px',
              }}
            >
              {name}
            </div>
          </div>
          <div
            style={{
              width: '100%',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '40px',
            }}
          >
            {weight}kg
          </div>
          <div
            style={{
              width: '100%',
              textAlign: 'center',
              fontSize: '14px',
              color: '#9B9B9B',
            }}
          >
            {editDate}
          </div>
          <div
            style={{
              width: '100%',
              display: 'flex',
              padding: '0 20px',
            }}
          >
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                padding: '8px 0',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
              onClick={handleClickUseless}
            >
              <span>사용 여부 기록하고</span>
              <span>무게 확인하기</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <svg
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M10 7L15 12L10 17'
                  stroke='black'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            </div>
          </div>
          <div
            style={{
              width: '100%',
              backgroundColor: '#F2F4F6',
              height: '16px',
            }}
          ></div>
        </div>
        <div
          style={{
            width: '100%',
            display: 'flex',
            padding: '15px 20px',
            justifyContent: 'space-between',
            fontSize: '17px',
          }}
        >
          <span
            style={{
              fontWeight: 'bold',
            }}
          >
            총 {gears.length}개의 장비
          </span>
          <span
            style={{
              fontWeight: '500',
              color: '#505967',
              fontSize: '16px',
            }}
          >
            정렬
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            height: '100%',
            padding: '0px 20px 0',
            overflowY: 'auto',
          }}
        >
          <ul
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              gap: '8px',
              paddingBottom: '16px',
            }}
          >
            {gears.map((gear) => {
              return <BagEditGearView key={gear.getId()} gear={gear} bagEdit={bagEdit} />;
            })}
          </ul>
        </div>
        <div
          style={{
            width: '100%',
            padding: '12px 24px',
          }}
        >
          <button
            style={{
              backgroundColor: 'black',
              width: '100%',
              padding: '18px',
              color: 'white',
              borderRadius: '10px',
            }}
            onClick={handleClickAdd}
          >
            장비 추가하기
          </button>
        </div>
      </div>
    );
  }
};

export default observer(BagEditView);

import { useLocation, useNavigate } from 'react-router-dom';
import { FC, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import BagEdit from '../bag/model/BagEdit';
import BagEditGearView from './BagEditGearView';
import BagEditUselessDescriptionView from './BagEditUselessDescriptionView';
import BagEditFiltersView from './BagEditFiltersView';

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
            paddingTop: '0.5rem',
            zIndex: 20,
            gap: '0rem',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                position: 'absolute',
                left: '1rem',
                top: '0.5rem',
              }}
              onClick={handleClickBack}
            >
              <svg
                width='1.5rem'
                height='1.5rem'
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
                fontSize: '1.25rem',
                lineHeight: '1.5rem',
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
              fontSize: '2.5rem',
            }}
          >
            {weight}kg
          </div>
          <div
            style={{
              width: '100%',
              textAlign: 'center',
              fontSize: '0.875rem',
              color: '#9B9B9B',
            }}
          >
            {editDate}
          </div>
          <BagEditUselessDescriptionView bagEdit={bagEdit} />
          <div
            style={{
              width: '100%',
              backgroundColor: '#F2F4F6',
              height: '0.625rem',
            }}
          ></div>
        </div>
        <div
          style={{
            width: '100%',
            display: 'flex',
            padding: '0.9375rem 1.25rem',
            justifyContent: 'space-between',
            fontSize: '1.0625rem',
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
              fontSize: '1rem',
            }}
          >
            정렬
          </span>
        </div>
        <BagEditFiltersView bagEdit={bagEdit} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            height: '100%',
            padding: '0 1.25rem 0',
            overflowY: 'auto',
          }}
        >
          <ul
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              gap: '0.5rem',
              paddingBottom: '1rem',
            }}
          >
            {bagEdit.mapGears((gear) => {
              return <BagEditGearView key={gear.getId()} gear={gear} bagEdit={bagEdit} />;
            })}
          </ul>
        </div>
        <div
          style={{
            width: '100%',
            padding: '0.75rem 1.5rem',
          }}
        >
          <button
            style={{
              backgroundColor: 'black',
              width: '100%',
              padding: '1.125rem',
              color: 'white',
              borderRadius: '0.625rem',
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

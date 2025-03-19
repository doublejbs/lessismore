import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import BagEditWarehouseView from './BagEditWarehouseView';
import BagEdit from '../bag/model/BagEdit';
import { useNavigate, useParams } from 'react-router-dom';

const BagEditAddGearView: FC = ({}) => {
  const { id = '' } = useParams();
  const [bagEdit] = useState(() => BagEdit.from(id));
  const navigate = useNavigate();
  const weight = bagEdit.getWeight();

  const handleClickBack = () => {
    navigate(`/bag/${id}`, { replace: true });
  };

  useEffect(() => {
    bagEdit.initialize();
  }, []);

  return (
    <>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          width: '100%',
          backgroundColor: 'white',
          padding: '16px',
        }}
      >
        <div
          style={{
            position: 'fixed',
            left: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onClick={handleClickBack}
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 30 30"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 5L8 12L15 19"
              stroke="black"
              strokeWidth="2"
              strokeLinejoin="round"
            />
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
          {weight}kg
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '0px 16px',
        }}
      >
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '16px',
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <div>내 장비</div>
        </div>
        <div
          style={{
            width: '100%',
            overflowY: 'auto',
          }}
        >
          <BagEditWarehouseView bagEdit={bagEdit} />
        </div>
      </div>
    </>
  );
};

export default observer(BagEditAddGearView);

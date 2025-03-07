import { useNavigate, useParams } from 'react-router-dom';
import { FC, useEffect, useState } from 'react';
import BagEdit from './BagEdit.ts';
import Layout from '../Layout.tsx';
import { observer } from 'mobx-react-lite';
import BagEditWarehouseView from './BagEditAddGearView.tsx';
import BagEditImageView from './BagEditImageView';

const BagEditView: FC = () => {
  const { id } = useParams();
  const [bagEdit] = useState(() => BagEdit.from(id ?? ''));
  const navigate = useNavigate();
  const [showWarehouse, setShowWarehouse] = useState(false);
  const name = bagEdit.getName();
  const weight = bagEdit.getWeight();
  const gears = bagEdit.getGears();

  const handleClickAdd = () => {
    setShowWarehouse(true);
  };

  const handleClickCloseWarehouse = () => {
    setShowWarehouse(false);
  };

  const handleClickBack = () => {
    navigate('/bag');
  };

  useEffect(() => {
    bagEdit.initialize();
  }, []);

  return (
    <>
      <div
        style={{
          position: 'fixed',
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
            position: 'absolute',
            left: '16px',
          }}
          onClick={handleClickBack}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
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
          {name}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          height: '100%',
          padding: '48px 16px 16px 16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0px',
          }}
        >
          <div
            style={{
              width: '100%',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '64px',
            }}
          >
            {weight}kg
          </div>
          <div
            style={{
              width: '100%',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            패킹 무게 기준
          </div>
        </div>
        <div
          style={{
            width: '100%',
            backgroundColor: '#F0F0F0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '4px',
            borderRadius: '4px',
          }}
          onClick={handleClickAdd}
        >
          <span>배낭 편집</span>
        </div>
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
            const imageUrl = gear.getImageUrl();

            return (
              <div
                key={gear.getId()}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  width: '100%',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    minWidth: '80px',
                    backgroundColor: '#F1F1F1',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <BagEditImageView imageUrl={imageUrl} isAdded={false} />
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'start',
                    justifyContent: 'center',
                    fontSize: '16px',
                    flexGrow: 1,
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>
                    <span>{gear.getName()}</span>
                  </div>
                  <div style={{}}>
                    <span>{gear.getWeight()}g</span>
                  </div>
                </div>
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'end',
                  }}
                >
                  <button
                    style={{
                      width: '64px',
                      backgroundColor: 'black',
                      color: 'white',
                      padding: '8px',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  >
                    Useful
                  </button>
                </div>
              </div>
            );
          })}
        </ul>
        {showWarehouse && (
          <BagEditWarehouseView
            onClose={handleClickCloseWarehouse}
            bagEdit={bagEdit}
          />
        )}
      </div>
    </>
  );
};

export default observer(BagEditView);

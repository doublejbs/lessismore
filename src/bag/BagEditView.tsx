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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '100%',
        marginTop: '10px',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '16px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'start',
          marginBottom: '10px',
        }}
      >
        <div
          style={{
            marginLeft: '10px',
            fontWeight: '400',
          }}
        >
          <button onClick={handleClickBack}>뒤로가기</button>
        </div>
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
      <div
        style={{
          width: '90%',
          height: '45px',
          backgroundColor: '#F0F0F0',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          margin: '10px',
        }}
        onClick={handleClickAdd}
      >
        <span>배낭 채우기</span>
      </div>
      <ul
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignContent: 'flex-start',
          width: '100%',
          height: '100%',
          flexWrap: 'wrap',
          padding: '10px',
        }}
      >
        {gears.map((gear) => {
          const imageUrl = gear.getImageUrl();

          return (
            <div
              key={gear.getId()}
              style={{
                width: '30%',
                height: '33%',
                display: 'flex',
                flexDirection: 'column',
                marginBottom: '10px',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                }}
              >
                {imageUrl ? (
                  <BagEditImageView imageUrl={imageUrl} isAdded={false} />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#F1F1F1',
                    }}
                  ></div>
                )}
              </div>
              <div
                style={{
                  height: '30px',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                <span>{gear.getName()}</span>
              </div>
              <div style={{ height: '30px', textAlign: 'center' }}>
                <span>{gear.getWeight()}g</span>
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
  );
};

export default observer(BagEditView);

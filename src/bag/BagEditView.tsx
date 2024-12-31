import { useNavigate, useParams } from 'react-router-dom';
import { FC, useEffect, useState } from 'react';
import BagEdit from './BagEdit.ts';
import Layout from '../Layout.tsx';
import { observer } from 'mobx-react-lite';
import BagEditWarehouseView from './BagEditWarehouseView.tsx';

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
      <ul>
        {gears.map((gear) => (
          <div key={gear.getId()}>{gear.getName()}</div>
        ))}
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

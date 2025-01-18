import { FC, useEffect, useState } from 'react';
import Warehouse from '../warehouse/Warehouse.ts';
import { observer } from 'mobx-react-lite';
import BagEdit from './BagEdit.ts';
import BagEditImageView from './BagEditImageView.tsx';
import BagEditWarehouseView from './BagEditWarehouseView';

interface Props {
  onClose: () => void;
  bagEdit: BagEdit;
}

const BagEditAddGearView: FC<Props> = ({ onClose, bagEdit }) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        height: '480px',
        width: '100%',
        borderRadius: '20px 20px 0',
        outline: '5px solid transparent',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
        backgroundColor: 'white',
        zIndex: 100,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          textAlign: 'center',
        }}
      >
        <button onClick={onClose}>닫기</button>
      </div>
      <div
        style={{
          padding: '10px 20px',
          fontWeight: 'bold',
          fontSize: '30px',
        }}
      >
        <span>창고</span>
      </div>
      <div
        style={{
          width: '100%',
          overflowY: 'auto',
          marginLeft: '10px',
          marginRight: '10px',
        }}
      >
        <BagEditWarehouseView bagEdit={bagEdit} />
      </div>
    </div>
  );
};

export default observer(BagEditAddGearView);

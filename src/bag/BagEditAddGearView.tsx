import { FC, useEffect, useState } from 'react';
import Warehouse from '../warehouse/Warehouse.ts';
import { observer } from 'mobx-react-lite';
import BagEdit from './BagEdit.ts';
import BagEditImageView from './BagEditImageView.tsx';
import BagEditWarehouseView from './BagEditWarehouseView';
import BagEditSearchView from './bag-edit-search/BagEditSearchView.tsx';

interface Props {
  onClose: () => void;
  bagEdit: BagEdit;
}

const BagEditAddGearView: FC<Props> = ({ onClose, bagEdit }) => {
  const [isWarehouseSelected, setIsWarehouseSelected] = useState(true);

  const handleClickWarehouse = () => {
    setIsWarehouseSelected(true);
  };

  const handleClickSearch = () => {
    setIsWarehouseSelected(false);
  };

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
          display: 'flex',
        }}
      >
        <div
          style={{
            padding: '10px 20px',
            fontWeight: isWarehouseSelected ? 'bold' : 'normal',
            fontSize: '30px',
          }}
        >
          <button onClick={handleClickWarehouse}>창고</button>
        </div>
        <div
          style={{
            padding: '10px 20px',
            fontWeight: isWarehouseSelected ? 'normal' : 'bold',
            fontSize: '30px',
          }}
        >
          <button onClick={handleClickSearch}>검색</button>
        </div>
      </div>
      <div
        style={{
          width: '100%',
          overflowY: 'auto',
        }}
      >
        {isWarehouseSelected ? (
          <BagEditWarehouseView bagEdit={bagEdit} />
        ) : (
          <BagEditSearchView bagEdit={bagEdit} />
        )}
      </div>
    </div>
  );
};

export default observer(BagEditAddGearView);

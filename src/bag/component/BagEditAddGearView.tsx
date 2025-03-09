import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import BagEditWarehouseView from './BagEditWarehouseView';
import BagEdit from '../model/BagEdit';
import BagEditSearchView from '../bag-edit-search/BagEditSearchView';

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
        borderRadius: '20px 20px 0 0',
        outline: '5px solid transparent',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
        backgroundColor: 'white',
        zIndex: 100,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <button onClick={onClose}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" y1="12" x2="20" y2="12" />
          </svg>
        </button>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            fontWeight: isWarehouseSelected ? 'bold' : 'normal',
            fontSize: '30px',
          }}
        >
          <button onClick={handleClickWarehouse}>창고</button>
        </div>
        <div
          style={{
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

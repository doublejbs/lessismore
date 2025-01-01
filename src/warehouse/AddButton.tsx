import { FC } from 'react';
import Warehouse from './Warehouse.ts';

interface Props {
  warehouse: Warehouse;
}

const AddButton: FC<Props> = ({ warehouse }) => {
  const handleClick = () => {
    warehouse.showSearch();
  };

  return (
    <button
      style={{
        position: 'fixed',
        right: '10px',
        bottom: '90px',
        borderRadius: '12px',
        border: '1px solid black',
        width: '64px',
        height: '64px',
        background: 'black',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
      onClick={handleClick}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="40"
        height="40"
        className="svg-cross"
      >
        <line x1="4" y1="12" x2="20" y2="12" stroke="white" strokeWidth="0.5" />
        <line x1="12" y1="4" x2="12" y2="20" stroke="white" strokeWidth="0.5" />
      </svg>
    </button>
  );
};

export default AddButton;

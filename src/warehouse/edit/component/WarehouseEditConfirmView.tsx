import React, { FC } from 'react';
import { observer } from 'mobx-react-lite';
import WarehouseEdit from '../model/WarehouseEdit';

interface Props {
  warehouseEdit: WarehouseEdit;
}

const WarehouseEditConfirmView: FC<Props> = ({ warehouseEdit }) => {
  const errorMessage = warehouseEdit.getErrorMessage();

  const handleClickConfirm = async () => {
    console.log('here');
    await warehouseEdit.register();
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        left: 0,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '0 16px',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          textAlign: 'center',
        }}
      >
        {errorMessage}
      </div>
      <button
        className={'clickable'}
        style={{
          width: '100%',
          textAlign: 'center',
          backgroundColor: 'black',
          color: 'white',
          padding: '8px',
          borderRadius: '5px',
        }}
        onClick={handleClickConfirm}
      >
        확인
      </button>
    </div>
  );
};

export default observer(WarehouseEditConfirmView);

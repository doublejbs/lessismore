import React, { FC } from 'react';
import CustomGear from './CustomGear.ts';
import Warehouse from '../Warehouse.ts';
import { observer } from 'mobx-react-lite';

interface Props {
  customGear: CustomGear;
}

const CustomGearConfirmView: FC<Props> = ({ customGear }) => {
  const errorMessage = customGear.getErrorMessage();

  const handleClickConfirm = async () => {
    await customGear.register();
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

export default observer(CustomGearConfirmView);

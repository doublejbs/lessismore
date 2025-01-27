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
        bottom: '10px',
        width: '100%',
      }}
    >
      <div
        style={{
          width: '100%',
          textAlign: 'center',
          margin: '10px',
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
          padding: '10px',
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

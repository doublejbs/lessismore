import Warehouse from '../Warehouse.ts';
import { FC } from 'react';
import CustomGear from './CustomGear.ts';

interface Props {
  customGear: CustomGear;
}

const CustomGearAddButtonView: FC<Props> = ({ customGear }) => {
  const handleClick = () => {
    customGear.show();
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '56px',
        width: '100%',
        left: 0,
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'row',
        paddingBottom: '16px',
      }}
    >
      <button
        style={{
          backgroundColor: 'lightgray',
          borderRadius: '5px',
          padding: '8px',
          fontSize: '14px',
        }}
        onClick={handleClick}
      >
        커스텀 장비 추가
      </button>
    </div>
  );
};

export default CustomGearAddButtonView;

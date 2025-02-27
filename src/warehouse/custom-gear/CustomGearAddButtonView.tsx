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
        backgroundColor: 'lightgray',
        borderRadius: '5px',
        padding: '4px',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}
    >
      <button onClick={handleClick}>커스텀 장비 추가</button>
    </div>
  );
};

export default CustomGearAddButtonView;

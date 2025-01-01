import Warehouse from '../Warehouse.ts';
import { FC } from 'react';

interface Props {
  warehouse: Warehouse;
}

const CustomGearAddButtonView: FC<Props> = ({ warehouse }) => {
  const handleClick = () => {
    warehouse.showCustom();
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '70px',
        backgroundColor: 'lightgray',
        borderRadius: '5px',
        padding: '5px',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}
    >
      <button onClick={handleClick}>커스텀 장비 추가</button>
    </div>
  );
};

export default CustomGearAddButtonView;

import { FC } from 'react';
import CustomGear from '../model/CustomGear';

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
        position: 'sticky',
        bottom: '0',
        width: '100%',
        left: 0,
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'row',
        marginTop: '16px',
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

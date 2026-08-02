import { FC } from 'react';
import CustomGear from '../model/CustomGear';
import { observer } from 'mobx-react-lite';
interface Props {
  customGear: CustomGear;
}

const CustomGearColorView: FC<Props> = ({ customGear }) => {
  const color = customGear.getColor();

  const handleChangeColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    customGear.setColor(e.target.value);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <span
        style={{
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        색상
      </span>
      <input
        style={{
          borderRadius: '10px',
          backgroundColor: '#F6F6F6',
          border: 'none',
          padding: '16px',
        }}
        placeholder={'색상을 입력해주세요'}
        onChange={handleChangeColor}
        value={color}
      />
    </div>
  );
};

export default observer(CustomGearColorView);

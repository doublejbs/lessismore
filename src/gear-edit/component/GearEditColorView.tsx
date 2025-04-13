import { FC } from 'react';
import GearEdit from '../model/GearEdit';
import { observer } from 'mobx-react-lite';
interface GearEditColorViewProps {
  gearEdit: GearEdit;
}

const GearEditColorView: FC<GearEditColorViewProps> = ({ gearEdit }) => {
  const color = gearEdit.getColor();

  const handleChangeColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    gearEdit.setColor(e.target.value);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
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
          padding: '12px',
          boxShadow: 'none',
        }}
        placeholder={'색상을 입력해주세요'}
        onChange={handleChangeColor}
        value={color}
      />
    </div>
  );
};

export default observer(GearEditColorView);

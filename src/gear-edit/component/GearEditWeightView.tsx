import React, { FC } from 'react';
import GearEdit from '../model/GearEdit';
import { observer } from 'mobx-react-lite';

interface Props {
  gearEdit: GearEdit;
}

const GearEditWeightView: FC<Props> = ({ gearEdit }) => {
  const weight = gearEdit.getWeight();

  const handleChangeWeight = (e: React.ChangeEvent<HTMLInputElement>) => {
    const trimmedValue = e.target.value.trim();

    if (trimmedValue.length) {
      const number = parseFloat(trimmedValue.replace(/[^0-9.-]/g, ''));

      if (isNaN(number)) {
        return;
      } else {
        gearEdit.setWeight(String(number));
      }
    } else {
      gearEdit.setWeight(trimmedValue);
    }
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
        무게(g)
      </span>
      <input
        style={{
          borderRadius: '10px',
          backgroundColor: '#F6F6F6',
          border: 'none',
          padding: '16px',
        }}
        onChange={handleChangeWeight}
        value={weight}
        placeholder={'무게를 입력해주세요'}
      />
    </div>
  );
};

export default observer(GearEditWeightView);

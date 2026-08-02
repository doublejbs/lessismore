import React, { FC } from 'react';
import CustomGear from '../model/CustomGear';
import { observer } from 'mobx-react-lite';

interface Props {
  customGear: CustomGear;
}

const CustomGearWeightView: FC<Props> = ({ customGear }) => {
  const weight = customGear.getWeight();

  const handleChangeWeight = (e: React.ChangeEvent<HTMLInputElement>) => {
    const trimmedValue = e.target.value.trim();

    if (trimmedValue.length) {
      const number = parseFloat(trimmedValue.replace(/[^0-9.-]/g, ''));

      if (isNaN(number)) {
        return;
      } else {
        customGear.setWeight(String(number));
      }
    } else {
      customGear.setWeight(trimmedValue);
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

export default observer(CustomGearWeightView);

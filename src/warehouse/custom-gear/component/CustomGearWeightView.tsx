import React, { FC, useEffect, useState } from 'react';
import CustomGear from '../model/CustomGear';
import { observer } from 'mobx-react-lite';

interface Props {
  customGear: CustomGear;
}

const CustomGearWeightView: FC<Props> = ({ customGear }) => {
  const weight = customGear.getWeight();
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setWidth(String(weight).length);
  }, [weight]);

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
        gap: '8px',
      }}
    >
      <span>무게(g)</span>
      <input
        style={{
          borderRadius: '5px',
          backgroundColor: 'lightgray',
          border: 'none',
        }}
        onChange={handleChangeWeight}
        value={weight}
      />
    </div>
  );
};

export default observer(CustomGearWeightView);

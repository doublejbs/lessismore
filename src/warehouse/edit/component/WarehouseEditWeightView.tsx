import React, { FC } from 'react';
import WarehouseEdit from '../model/WarehouseEdit';
import { observer } from 'mobx-react-lite';

interface Props {
  warehouseEdit: WarehouseEdit;
}

const WarehouseEditWeightView: FC<Props> = ({ warehouseEdit }) => {
  const weight = warehouseEdit.getWeight();

  const handleChangeWeight = (e: React.ChangeEvent<HTMLInputElement>) => {
    const trimmedValue = e.target.value.trim();

    if (trimmedValue.length) {
      const number = parseFloat(trimmedValue.replace(/[^0-9.-]/g, ''));

      if (isNaN(number)) {
        return;
      } else {
        warehouseEdit.setWeight(String(number));
      }
    } else {
      warehouseEdit.setWeight(trimmedValue);
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
          border: 'none',
          backgroundColor: '#F1F1F1',
        }}
        onChange={handleChangeWeight}
        value={weight}
      />
    </div>
  );
};

export default observer(WarehouseEditWeightView);

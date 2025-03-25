import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import Warehouse from '../warehouse/model/Warehouse.ts';
import BagEdit from '../bag/model/BagEdit';
import BagEditWarehouseGearView from './BagEditWarehouseGearView';
import { useNavigate } from 'react-router-dom';
import WarehouseDispatcher from '../warehouse/model/WarehouseDispatcher.ts';
import app from '../App';

interface Props {
  bagEdit: BagEdit;
}

const BagEditWarehouseView: FC<Props> = ({ bagEdit }) => {
  const [warehouse] = useState(() =>
    Warehouse.from(WarehouseDispatcher.new(), app.getToastManager())
  );
  const navigate = useNavigate();
  const gears = warehouse.getGears();

  const handleClickSearch = () => {
    navigate(`/bag/${bagEdit.getId()}/edit/search`);
  };

  useEffect(() => {
    warehouse.getList();
  }, []);

  return (
    <ul
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill,minmax(min(100px,100%),1fr))',
        rowGap: '1.25rem',
        columnGap: '0.625rem',
      }}
    >
      <li
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
        onClick={handleClickSearch}
      >
        <div
          style={{
            aspectRatio: '1/1',
            border: '1px solid grey',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="black"
              stroke-width="5"
              fill="white"
            />
            <line
              x1="50"
              y1="30"
              x2="50"
              y2="70"
              stroke="black"
              stroke-width="8"
              stroke-linecap="round"
            />
            <line
              x1="30"
              y1="50"
              x2="70"
              y2="50"
              stroke="black"
              stroke-width="8"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <div
          style={{
            fontWeight: 'bold',
          }}
        >
          <span>장비 추가</span>
        </div>
      </li>
      {gears.map((gear) => {
        return (
          <BagEditWarehouseGearView
            key={gear.getId()}
            gear={gear}
            bagEdit={bagEdit}
          />
        );
      })}
    </ul>
  );
};

export default observer(BagEditWarehouseView);

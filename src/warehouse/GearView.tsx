import { FC } from 'react';
import GearType from './type/GearType';

interface Props {
  gear: GearType;
}

const GearView: FC<Props> = ({ gear }) => {
  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        flexDirection: 'row',
        padding: '10px',
        width: '100%',
      }}
    >
      <div
        style={{
          marginRight: '20px',
          width: '30%',
          height: '30%',
        }}
      >
        <img src={gear.imageUrl} width={100} height={100} />
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
          width: '70%',
        }}
      >
        <span
          style={{
            fontWeight: 'bold',
          }}
        >
          {gear.name}
        </span>
        <span>{gear.company}</span>
        <span>{gear.weight}g</span>
      </div>
    </div>
  );
};

export default GearView;

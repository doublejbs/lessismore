import { FC, ReactNode } from 'react';
import Gear from './search-warehouse/Gear';

interface Props {
  gear: Gear;
  children?: ReactNode;
}

const GearView: FC<Props> = ({ gear, children }) => {
  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        flexDirection: 'row',
        padding: '10px',
        width: '100%',
        position: 'relative',
      }}
    >
      <div
        style={{
          marginRight: '20px',
          width: '30%',
          height: '30%',
        }}
      >
        <img src={gear.getImageUrl()} width={100} height={100} />
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
          {gear.getName()}
        </span>
        <span>{gear.getCompany()}</span>
        <span>{gear.geWeight()}g</span>
      </div>
      {children}
    </div>
  );
};

export default GearView;
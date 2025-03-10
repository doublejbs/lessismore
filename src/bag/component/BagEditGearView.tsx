import { FC } from 'react';
import BagEditImageView from './BagEditImageView';
import Gear from '../../model/Gear';
import BagEdit from '../model/BagEdit';

interface Props {
  gear: Gear;
  bagEdit: BagEdit;
}

const BagEditGearView: FC<Props> = ({ gear, bagEdit }) => {
  const imageUrl = gear.getImageUrl();

  const handleClick = () => {
    bagEdit.removeGear(gear);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        gap: '8px',
      }}
    >
      <div
        style={{
          width: '80px',
          height: '80px',
          minWidth: '80px',
          backgroundColor: '#F1F1F1',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <BagEditImageView imageUrl={imageUrl} />
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'start',
          justifyContent: 'center',
          fontSize: '14px',
          flexGrow: 1,
        }}
      >
        <div className={'text-ellipsis'} style={{ fontWeight: 'bold' }}>
          <span>{gear.getName()}</span>
        </div>
        <div style={{}}>
          <span>{gear.getWeight()}g</span>
        </div>
      </div>
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'end',
        }}
      >
        <button
          style={{
            backgroundColor: '#F1F1F1',
            color: 'black',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          onClick={handleClick}
        >
          🗑️
        </button>
        {/*<button*/}
        {/*  style={{*/}
        {/*    width: '64px',*/}
        {/*    backgroundColor: 'black',*/}
        {/*    color: 'white',*/}
        {/*    padding: '8px',*/}
        {/*    borderRadius: '8px',*/}
        {/*    fontSize: '12px',*/}
        {/*  }}*/}
        {/*>*/}
        {/*  Useful*/}
        {/*</button>*/}
      </div>
    </div>
  );
};

export default BagEditGearView;

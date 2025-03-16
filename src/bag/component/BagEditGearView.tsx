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
  const isUseless = bagEdit.isUseless(gear);

  const handleClick = () => {
    bagEdit.removeGear(gear);
  };

  const handleClickUseless = () => {
    bagEdit.toggleUseless(gear);
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
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <BagEditImageView imageUrl={imageUrl} shadow={isUseless} />
        {isUseless && (
          <div
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              position: 'absolute',
              transform:
                'translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))',
              rotate: '-10.78deg',
              letterSpacing: '-2px',
            }}
          >
            useless
          </div>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'start',
          justifyContent: 'center',
          fontSize: '14px',
          flexGrow: 1,
          color: isUseless ? 'grey' : 'black',
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
          justifyContent: 'space-between',
          alignItems: 'end',
        }}
      >
        <button
          style={{
            backgroundColor: '#F1F1F1',
            color: 'black',
            padding: '8px',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          onClick={handleClick}
        >
          🗑️
        </button>
        {isUseless ? (
          <button
            style={{
              width: '64px',
              backgroundColor: 'white',
              color: 'black',
              padding: '4px',
              borderRadius: '8px',
              fontSize: '12px',
              border: '1px solid black',
            }}
            onClick={handleClickUseless}
          >
            useless
          </button>
        ) : (
          <button
            style={{
              width: '64px',
              backgroundColor: 'black',
              color: 'white',
              padding: '4px',
              borderRadius: '8px',
              fontSize: '12px',
              border: '1px solid black',
            }}
            onClick={handleClickUseless}
          >
            used
          </button>
        )}
      </div>
    </div>
  );
};

export default BagEditGearView;

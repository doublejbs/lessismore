import { FC, ReactNode } from 'react';
import Gear from './search-warehouse/Gear';
import GearImageView from './GearImageView.tsx';

interface Props {
  gear: Gear;
  children?: ReactNode;
}

const GearView: FC<Props> = ({ gear, children }) => {
  const imageUrl = gear.getImageUrl();

  return (
    <div
      style={{
        display: 'flex',
        height: '124px',
        flexDirection: 'row',
        padding: '10px',
        width: '100%',
        position: 'relative',
      }}
    >
      <div
        style={{
          marginRight: '20px',
          flex: '0 0 30%',
          height: '100%',
        }}
      >
        {imageUrl ? (
          <GearImageView imageUrl={imageUrl} />
        ) : (
          <div
            style={{
              width: '100px',
              height: '100px',
              backgroundColor: '#F1F1F1',
            }}
          ></div>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: '1',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            height: '50px',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              fontWeight: 'bold',
              fontSize: '16px',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            {gear.getName()}
          </div>
          <div
            style={{
              fontSize: '12px',
            }}
          >
            {gear.getCompany()}
          </div>
        </div>

        <div
          style={{
            fontSize: '16px',
          }}
        >
          {gear.getWeight()}g
        </div>
      </div>
      {children}
    </div>
  );
};

export default GearView;

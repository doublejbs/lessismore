import { FC, ReactNode } from 'react';
import Gear from './search-warehouse/Gear';

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
          width: '30%',
          height: '30%',
        }}
      >
        {imageUrl ? (
          <img src={imageUrl} width={100} height={100} />
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
          width: '70%',
        }}
      >
        <div
          style={{
            display: 'flex',
            height: '50px',
            flexDirection: 'column',
          }}
        >
          <span
            style={{
              fontWeight: 'bold',
              fontSize: '16px',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {gear.getName()}
          </span>
          <span
            style={{
              fontSize: '12px',
            }}
          >
            {gear.getCompany()}
          </span>
        </div>

        <span
          style={{
            fontSize: '16px',
          }}
        >
          {gear.getWeight()}g
        </span>
      </div>
      {children}
    </div>
  );
};

export default GearView;

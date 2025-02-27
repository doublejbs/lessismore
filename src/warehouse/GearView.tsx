import { FC, ReactNode } from 'react';
import GearImageView from './GearImageView.tsx';
import Gear from '../search-warehouse/Gear';

interface Props {
  gear: Gear;
  children?: ReactNode;
}

const GearView: FC<Props> = ({ gear, children }) => {
  const imageUrl = gear.getImageUrl();

  return (
    <li>
      <div
        style={{
          display: 'flex',
          height: '160px',
          flexDirection: 'row',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '16px',
            flexGrow: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: '120px',
              height: '160px',
              backgroundColor: '#F1F1F1',
              display: 'flex',
              alignItems: 'center',
              minWidth: '120px',
            }}
          >
            <GearImageView imageUrl={imageUrl} />
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
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
          </div>
        </div>
        {children}
      </div>
    </li>
  );
};

export default GearView;

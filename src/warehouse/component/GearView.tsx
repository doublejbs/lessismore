import { FC, ReactNode } from 'react';
import GearImageView from './GearImageView.tsx';
import Gear from '../../model/Gear.ts';

interface Props {
  gear: Gear;
  children?: ReactNode;
  onClick?: () => void;
}

const GearView: FC<Props> = ({ gear, children, onClick }) => {
  const imageUrl = gear.getImageUrl();

  return (
    <li
      style={{
        display: 'flex',
        padding: '16px 0px',
        borderBottom: '1px solid #F1F1F1',
        gap: '8px',
      }}
      onClick={onClick}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '8px',
          flexGrow: 1,
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#F1F1F1',
            display: 'flex',
            alignItems: 'center',
            minWidth: '80px',
            borderRadius: '4px',
            justifyContent: 'center',
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
              justifyContent: 'space-between',
              fontSize: '14px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                {gear.getCompany()}
              </div>
              <p className={'text-ellipsis'} style={{}}>
                {gear.getName()}
              </p>
            </div>
            <div
              style={{
                fontWeight: 'bold',
              }}
            >
              {gear.getWeight() ? `${gear.getWeight()}g` : ''}
            </div>
          </div>
        </div>
      </div>
      {children}
    </li>
  );
};

export default GearView;

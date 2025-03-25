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
        padding: '12px 0px',
        gap: '16px',
      }}
      onClick={onClick}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '8px',
        }}
      >
        <div
          style={{
            width: '100px',
            height: '100px',
            backgroundColor: '#F1F1F1',
            display: 'flex',
            alignItems: 'center',
            minWidth: '100px',
            borderRadius: '4px',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <GearImageView imageUrl={imageUrl} />
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          paddingTop: '4px',
          flexGrow: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            fontSize: '14px',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              gap: '9px',
              lineHeight: '1',
            }}
          >
            <div
              className={'text-ellipsis'}
              style={{
                fontSize: '16px',
                fontWeight: 'bold',
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
              fontWeight: 'bold',
            }}
          >
            {gear.getWeight() ? `${gear.getWeight()}g` : ''}
          </div>
        </div>
      </div>
      {children}
    </li>
  );
};

export default GearView;

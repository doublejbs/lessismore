import React, { FC, ReactNode } from 'react';
import GearImageView from './GearImageView.tsx';
import Gear from '../../model/Gear.ts';

interface Props {
  gear: Gear;
  children?: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

const GearView: FC<Props> = ({ gear, children, onClick }) => {
  const imageUrl = gear.getImageUrl();

  return (
    <li
      style={{
        display: 'flex',
        padding: '10px 0px',
        gap: '12px',
      }}
      onClick={onClick}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '6px',
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
          paddingTop: '3px',
          flexGrow: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            fontSize: '12px',
            gap: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '7px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  gap: '7px',
                  lineHeight: '1',
                }}
              >
                <div
                  className={'text-ellipsis'}
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                >
                  {gear.getName()}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                  }}
                >
                  {gear.getCompany()}
                </div>
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                {gear.getWeight() ? `${gear.getWeight()}g` : ''}
              </div>
            </div>
            {gear.hasUsedRate() && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '3px',
                  fontSize: '7px',
                  alignItems: 'center',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    borderRadius: '10px',
                    backgroundColor: 'rgb(235, 235, 235)',
                    color: 'black',
                    padding: '3px 6px',
                  }}
                >
                  사용률 {gear.getUsedRate()}%
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {children}
    </li>
  );
};

export default GearView;

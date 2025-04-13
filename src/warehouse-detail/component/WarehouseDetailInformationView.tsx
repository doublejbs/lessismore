import React, { FC } from 'react';
import GearImageView from '../../warehouse/component/GearImageView';
import Gear from '../../model/Gear';

interface Props {
  gear: Gear;
}

const WarehouseDetailInformationView: FC<Props> = ({ gear }) => {
  const imageUrl = gear.getImageUrl();
  const company = gear.getCompany();
  const name = gear.getName();
  const weight = gear.getWeight();
  const usedCount = gear.getUsedCount();
  const uselessCount = gear.getUselessCount();
  const color = gear.getColor();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        paddingBottom: '36px',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '180px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {imageUrl ? (
          <div
            style={{
              height: '100%',
            }}
          >
            <GearImageView imageUrl={imageUrl} />
          </div>
        ) : (
          <svg
            width='25'
            height='24'
            viewBox='0 0 25 24'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M8.00508 6.12023V7.12023C8.36074 7.12023 8.68965 6.93132 8.86886 6.62411L8.00508 6.12023ZM9.68508 3.24023V2.24023C9.32941 2.24023 9.00051 2.42915 8.8213 2.73636L9.68508 3.24023ZM15.9251 3.24023L16.7889 2.73636C16.6096 2.42915 16.2807 2.24023 15.9251 2.24023V3.24023ZM17.6051 6.12023L16.7413 6.62411C16.9205 6.93132 17.2494 7.12023 17.6051 7.12023V6.12023ZM4.20508 18.3602V8.52023H2.20508V18.3602H4.20508ZM5.60508 7.12023H8.00508V5.12023H5.60508V7.12023ZM8.86886 6.62411L10.5489 3.74411L8.8213 2.73636L7.1413 5.61636L8.86886 6.62411ZM9.68508 4.24023H15.9251V2.24023H9.68508V4.24023ZM15.0613 3.74411L16.7413 6.62411L18.4689 5.61636L16.7889 2.73636L15.0613 3.74411ZM17.6051 7.12023H20.0051V5.12023H17.6051V7.12023ZM21.4051 8.52023V18.3602H23.4051V8.52023H21.4051ZM21.4051 18.3602C21.4051 19.1334 20.7783 19.7602 20.0051 19.7602V21.7602C21.8828 21.7602 23.4051 20.238 23.4051 18.3602H21.4051ZM20.0051 7.12023C20.7783 7.12023 21.4051 7.74704 21.4051 8.52023H23.4051C23.4051 6.64247 21.8828 5.12023 20.0051 5.12023V7.12023ZM4.20508 8.52023C4.20508 7.74703 4.83188 7.12023 5.60508 7.12023V5.12023C3.72731 5.12023 2.20508 6.64246 2.20508 8.52023H4.20508ZM5.60508 19.7602C4.83188 19.7602 4.20508 19.1334 4.20508 18.3602H2.20508C2.20508 20.238 3.72731 21.7602 5.60508 21.7602V19.7602ZM15.4051 12.8402C15.4051 14.2762 14.241 15.4402 12.8051 15.4402V17.4402C15.3456 17.4402 17.4051 15.3807 17.4051 12.8402H15.4051ZM12.8051 15.4402C11.3691 15.4402 10.2051 14.2762 10.2051 12.8402H8.20508C8.20508 15.3807 10.2646 17.4402 12.8051 17.4402V15.4402ZM10.2051 12.8402C10.2051 11.4043 11.3691 10.2402 12.8051 10.2402V8.24023C10.2646 8.24023 8.20508 10.2997 8.20508 12.8402H10.2051ZM12.8051 10.2402C14.241 10.2402 15.4051 11.4043 15.4051 12.8402H17.4051C17.4051 10.2997 15.3456 8.24023 12.8051 8.24023V10.2402ZM20.0051 19.7602H5.60508V21.7602H20.0051V19.7602Z'
              fill='black'
            />
          </svg>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '22px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span
              style={{
                fontSize: '13px',
                color: '#505967',
              }}
            >
              {company}
            </span>
            <span
              style={{
                fontWeight: 'bold',
                fontSize: '20px',
              }}
            >
              {name}
            </span>
            <span
              style={{
                fontSize: '16px',
              }}
            >
              {color}
            </span>
          </div>
          <div>
            <span
              style={{
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              {weight}g
            </span>
          </div>
        </div>
        <div
          style={{
            width: '100%',
            display: 'flex',
            gap: '12px',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              backgroundColor: '#F3F3F3',
              borderRadius: '10px',
            }}
          >
            <span
              style={{
                fontSize: '14px',
              }}
            >
              USED
            </span>
            <span
              style={{
                fontSize: '15px',
                fontWeight: '500',
              }}
            >
              {`${usedCount}회`}
            </span>
          </div>
          <div
            style={{
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              backgroundColor: '#F3F3F3',
              borderRadius: '10px',
            }}
          >
            <span
              style={{
                fontSize: '14px',
              }}
            >
              USELESS
            </span>
            <span
              style={{
                fontSize: '15px',
                fontWeight: '500',
              }}
            >
              {`${uselessCount}회`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseDetailInformationView;

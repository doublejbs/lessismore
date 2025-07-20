import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import Gear from '../../model/Gear';

interface Props {
  gear: Gear;
}

const BagShareGearView: FC<Props> = ({ gear }) => {
  const imageUrl = gear.getImageUrl();
  const name = gear.getName();
  const company = gear.getCompany();
  const weight = gear.getWeight();

  return (
    <li
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        gap: '6px',
        padding: '12px',
        backgroundColor: 'white',
        listStyle: 'none',
      }}
    >
      <div
        style={{
          width: '60px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F9FAFB',
          borderRadius: '6px',
          overflow: 'hidden',
        }}
      >
        {imageUrl && String(imageUrl) !== 'true' ? (
          <img
            src={imageUrl}
            alt={name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: '#6B7280',
            }}
          >
            이미지 없음
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          gap: '4px',
        }}
      >
        <div
          style={{
            fontSize: '14px',
            color: '#6B7280',
            lineHeight: '1.2',
          }}
        >
          {company}
        </div>
        <div
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#1F2937',
            lineHeight: '1.2',
          }}
        >
          {name}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          minWidth: '50px',
          justifyContent: 'flex-end',
        }}
      >
        {weight}g
      </div>
    </li>
  );
};

export default observer(BagShareGearView);

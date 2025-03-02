import { FC } from 'react';
import GearView from './GearView';
import Warehouse from './Warehouse';
import Gear from '../search-warehouse/Gear';
import GearImageView from './GearImageView.tsx';
import { useNavigate } from 'react-router-dom';

interface Props {
  gear: Gear;
  warehouse: Warehouse;
}

const WarehouseGearView: FC<Props> = ({ gear, warehouse }) => {
  const imageUrl = gear.getImageUrl();
  const navigate = useNavigate();

  const handleClick = () => {
    warehouse.remove(gear);
  };

  const handleClickEdit = () => {
    // navigate(`/warehouse/edit/${gear.getId()}`);
  };

  return (
    <li style={{}} onClick={handleClickEdit}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          gap: '8px',
        }}
      >
        <div
          style={{
            height: '100%',
            backgroundColor: '#F1F1F1',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            aspectRatio: '2000 / 2500',
            borderRadius: '4px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '32px',
              position: 'absolute',
              bottom: '8px',
              right: '8px',
            }}
          >
            <button
              style={{
                width: '32px',
                backgroundColor: '#F1F1F1',
                borderRadius: '5px',
              }}
              onClick={handleClick}
            >
              🗑️
            </button>
          </div>
          <GearImageView imageUrl={imageUrl} />
        </div>
        <div
          style={{
            display: 'flex',
            height: '100%',
            flexDirection: 'column',
            gap: '2px',
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
          <div
            style={{
              fontSize: '16px',
            }}
          >
            {gear.getWeight()}g
          </div>
        </div>
      </div>
    </li>
  );
};

export default WarehouseGearView;

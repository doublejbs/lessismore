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
    navigate(`/warehouse/edit/${gear.getId()}`);
  };

  return (
    <li style={{}} onClick={handleClickEdit}>
      <div
        style={{
          display: 'flex',
          height: '160px',
          flexDirection: 'row',
          justifyContent: 'space-between',
          position: 'relative',
          gap: '16px',
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
              flexDirection: 'column',
              justifyContent: 'center',
              minWidth: '120px',
            }}
          >
            <GearImageView imageUrl={imageUrl} />
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              minWidth: 0,
              flexGrow: 1,
            }}
          >
            <div
              style={{
                display: 'flex',
                height: '50px',
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
        <div
          style={{
            width: '32px',
            height: '160px',
          }}
        >
          <button
            style={{
              height: '32px',
              width: '32px',
              backgroundColor: '#F1F1F1',
            }}
            onClick={handleClick}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="32"
              height="32"
              className="svg-cross"
            >
              <line
                x1="4"
                y1="12"
                x2="20"
                y2="12"
                stroke="black"
                strokeWidth="0.5"
              />
            </svg>
          </button>
        </div>
      </div>
    </li>
  );
};

export default WarehouseGearView;

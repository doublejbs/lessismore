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
        <div>
          <button
            style={{
              border: '1px solid black',
              borderRadius: '20%',
              padding: '2px',
            }}
            onClick={handleClickEdit}
          >
            수정
          </button>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'start',
          alignItems: 'start',
          width: '36px',
        }}
      >
        <button
          style={{
            height: '36px',
            width: '36px',
            backgroundColor: '#F1F1F1',
            marginTop: '10px',
          }}
          onClick={handleClick}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="36"
            height="36"
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
  );
};

export default WarehouseGearView;

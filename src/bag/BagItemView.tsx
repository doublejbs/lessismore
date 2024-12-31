import BagItem from './BagItem.ts';
import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import Bag from './Bag.ts';
import bag from './Bag.ts';

interface Props {
  bagItem: BagItem;
  bag: Bag;
}
const BagItemView: FC<Props> = ({ bagItem, bag }) => {
  const navigate = useNavigate();
  const id = bagItem.getID();

  const handleClick = () => {
    navigate(`/bag/${id}`);
  };

  const handleClickDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    bag.delete(bagItem);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '124px',
        display: 'flex',
        justifyContent: 'space-between',
        padding: '20px',
      }}
      onClick={handleClick}
    >
      <div>
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '16px',
          }}
        >
          {bagItem.getName()}
        </div>
        <div
          style={{
            fontSize: '12px',
          }}
        >
          최근 수정일시 {bagItem.getEditDate()}
        </div>
        <div
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          {bagItem.getWeight()}kg
        </div>
      </div>
      <button
        style={{
          height: '36px',
          width: '36px',
          backgroundColor: '#F1F1F1',
        }}
        onClick={handleClickDelete}
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
  );
};

export default BagItemView;

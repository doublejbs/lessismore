import BagItem from './BagItem.ts';
import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import Bag from './Bag.ts';

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
        display: 'flex',
        justifyContent: 'space-between',
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
          height: '32px',
          width: '32px',
          padding: '4px',
          backgroundColor: '#F1F1F1',
          fontSize: '16px',
          borderRadius: '4px',
        }}
        onClick={handleClickDelete}
      >
        🗑️
      </button>
    </div>
  );
};

export default BagItemView;

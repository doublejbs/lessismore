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
        padding: '5px',
      }}
      onClick={handleClick}
    >
      <div>
        <div>{bagItem.getName()}</div>
        <div>최근 수정일시 {bagItem.getEditDate()}</div>
        <div>{bagItem.getWeight()}kg</div>
      </div>

      <button
        style={{
          backgroundColor: 'lightgray',
          width: '30px',
          height: '30px',
        }}
        onClick={handleClickDelete}
      >
        -
      </button>
    </div>
  );
};

export default BagItemView;

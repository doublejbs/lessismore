import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import Bag from '../model/Bag';
import BagItem from '../model/BagItem';

interface Props {
  bagItem: BagItem;
  bag: Bag;
}
const BagItemView: FC<Props> = ({ bagItem, bag }) => {
  const navigate = useNavigate();
  const id = bagItem.getID();

  const handleClick = () => {
    navigate(`/bag/${id}`, { state: { from: '/bag' } });
  };

  const handleClickDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    bag.delete(bagItem);
  };

  const handleClickUseless = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/bag/${id}/useless`, { state: { from: '/bag' } });
  };

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 0 20px',
        gap: '20px',
        borderBottom: '1px solid #F2F4F6',
      }}
      onClick={handleClick}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{bagItem.getName()}</div>
            <div style={{ fontSize: '12px' }}>최근 수정일시 {bagItem.getEditDate()}</div>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{bagItem.getWeight()}kg</div>
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
      <button
        style={{
          backgroundColor: '#F5F7FB',
          fontSize: '14px',
          padding: '10px 0',
          borderRadius: '8px',
          fontWeight: '500',
        }}
        onClick={handleClickUseless}
      >
        사용 여부 입력하기
      </button>
    </div>
  );
};

export default BagItemView;

import BagItem from './BagItem.ts';
import { FC } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  bag: BagItem;
}
const BagItemView: FC<Props> = ({ bag }) => {
  const navigate = useNavigate();
  const id = bag.getID();
  const handleClick = () => {
    navigate(`/bag/${id}`);
  };

  return <div onClick={handleClick}>{bag.getName()}</div>;
};

export default BagItemView;

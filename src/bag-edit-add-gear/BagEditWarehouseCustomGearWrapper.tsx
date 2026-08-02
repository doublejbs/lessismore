import { FC, useState } from 'react';
import BagEdit from './model/BagEdit';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import CustomGearView from '../custom-gear/component/CustomGearView';
import BagEditCustomGear from './model/BagEditCustomGear';

interface Props {
  bagEdit: BagEdit;
}

const BagEditWarehouseCustomGearWrapper: FC<Props> = ({ bagEdit }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [customGear] = useState(() => BagEditCustomGear.of(bagEdit, navigate, location));

  if (!bagEdit.isCustomVisible()) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: 'white',
        height: '90%',
        borderRadius: '10px 10px 0 0',
        zIndex: 12,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <CustomGearView customGear={customGear} />
    </div>
  );
};

export default observer(BagEditWarehouseCustomGearWrapper);

import { FC } from 'react';
import BagEditWarehouseAddMenuView from './BagEditWarehouseAddMenuView';
import BagEditWarehouseCustomGearWrapper from './BagEditWarehouseCustomGearWrapper';
import BagEditWarehouseSearchWrapper from './BagEditWarehouseSearchWrapper';
import BagEdit from './model/BagEdit';

interface Props {
  bagEdit: BagEdit;
  onHideMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const BagEditWarehouseAddView: FC<Props> = ({ bagEdit, onHideMenu }) => {
  if (!bagEdit.isAddMenuVisible()) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        zIndex: 10,
      }}
      onClick={onHideMenu}
    >
      <BagEditWarehouseAddMenuView bagEdit={bagEdit} />
      <BagEditWarehouseSearchWrapper bagEdit={bagEdit} />
      <BagEditWarehouseCustomGearWrapper bagEdit={bagEdit} />
    </div>
  );
};

export default BagEditWarehouseAddView;

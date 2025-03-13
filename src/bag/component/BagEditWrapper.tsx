import { FC, useState } from 'react';
import { useParams } from 'react-router-dom';
import BagEdit from '../model/BagEdit';
import { observer } from 'mobx-react-lite';
import BagEditView from './BagEditView';
import BagEditAddGearView from './BagEditAddGearView';

const BagEditWrapper: FC = () => {
  const { id } = useParams();
  const [bagEdit] = useState(() => BagEdit.from(id ?? ''));
  const shouldShowWarehouse = bagEdit.shouldShowWarehouse();
  const shouldShowSearch = bagEdit.shouldShowSearch();

  if (shouldShowWarehouse) {
    return <BagEditAddGearView bagEdit={bagEdit} />;
  } else if (shouldShowSearch) {
  } else {
    return <BagEditView bagEdit={bagEdit} />;
  }
};

export default observer(BagEditWrapper);

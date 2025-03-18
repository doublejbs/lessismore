import { FC, useState } from 'react';
import { useParams } from 'react-router-dom';
import BagEdit from '../model/BagEdit';
import { observer } from 'mobx-react-lite';
import BagEditView from './BagEditView';

const BagEditWrapper: FC = () => {
  const { id } = useParams();
  const [bagEdit] = useState(() => BagEdit.from(id ?? ''));

  return <BagEditView bagEdit={bagEdit} />;
};

export default observer(BagEditWrapper);

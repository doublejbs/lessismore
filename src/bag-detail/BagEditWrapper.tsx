import { FC, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import BagEdit from '../bag/model/BagEdit';
import { observer } from 'mobx-react-lite';
import BagEditView from './BagEditView';

const BagEditWrapper: FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [bagEdit] = useState(() => BagEdit.from(navigate, location, id ?? ''));

  return <BagEditView bagEdit={bagEdit} />;
};

export default observer(BagEditWrapper);

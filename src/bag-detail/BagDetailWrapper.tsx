import { FC, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import BagDetail from './model/BagDetail';
import { observer } from 'mobx-react-lite';
import BagDetailView from './BagDetailView';

const BagDetailWrapper: FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [bagDetail] = useState(() => BagDetail.from(navigate, location, id ?? ''));

  return <BagDetailView bagDetail={bagDetail} />;
};

export default observer(BagDetailWrapper);

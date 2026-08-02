import { FC, useState } from 'react';
import { useParams } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import BagShare from '../model/BagShare';
import BagShareView from './BagShareView';

const BagShareWrapper: FC = () => {
  const { id } = useParams();
  const [bagShare] = useState(() => BagShare.from(id ?? ''));

  return <BagShareView bagShare={bagShare} />;
};

export default observer(BagShareWrapper);

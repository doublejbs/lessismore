import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import BagShare from '../model/BagShare';
import BagShareView from './BagShareView';
import { useActivityParams } from '@stackflow/react';

const BagShareWrapper: FC = () => {
  const { id } = useActivityParams() as { id: string };
  const [bagShare] = useState(() => BagShare.from(id ?? ''));

  return <BagShareView bagShare={bagShare} />;
};

export default observer(BagShareWrapper);

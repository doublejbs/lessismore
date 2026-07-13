import { FC, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import GearShare from '../model/GearShare';
import GearShareView from './GearShareView';

// 장비 공유 랜딩(GD-7) 진입. /gear-share/:id 에서 장비를 로드해 표시한다.
const GearShareWrapper: FC = () => {
  const { id } = useParams();
  const [gearShare] = useState(() => GearShare.from(id ?? ''));

  useEffect(() => {
    void gearShare.initialize();
  }, [gearShare]);

  return <GearShareView gearShare={gearShare} />;
};

export default observer(GearShareWrapper);

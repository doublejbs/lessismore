import { FC, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import CampShare from '../model/CampShare';
import CampShareView from './CampShareView';

// 박지 공유 랜딩(CS-7) 진입. /camp-share/:id 에서 박지를 로드해 표시한다.
const CampShareWrapper: FC = () => {
  const { id } = useParams();
  const [campShare] = useState(() => CampShare.from(id ?? ''));

  useEffect(() => {
    void campShare.initialize();
  }, [campShare]);

  return <CampShareView campShare={campShare} />;
};

export default observer(CampShareWrapper);

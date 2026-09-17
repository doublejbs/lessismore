import { FC, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import GroupInvite from '../model/GroupInvite';
import GroupInviteView from './GroupInviteView';

// 그룹 초대 랜딩(GRP-3) 진입. /group/:id 에서 그룹 요약을 로드해 표시한다.
// useParams가 이미 디코딩해 주므로 여기 id는 원본 groupId다.
const GroupInviteWrapper: FC = () => {
  const { id } = useParams();
  const [groupInvite] = useState(() => GroupInvite.from(id ?? ''));

  useEffect(() => {
    void groupInvite.initialize();
  }, [groupInvite]);

  return <GroupInviteView groupInvite={groupInvite} />;
};

export default observer(GroupInviteWrapper);

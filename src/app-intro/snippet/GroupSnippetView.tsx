import { FC } from 'react';
import SnippetRowView from './SnippetRowView';

const MEMBER_INITIALS = ['진', '민', '수'];

// 그룹: 멤버·배낭 요약 줄(AppIntroSpec §3.3).
const GroupSnippetView: FC = () => {
  return (
    <div className='app-intro-group'>
      <div className='app-intro-avatars'>
        {MEMBER_INITIALS.map((initial) => (
          <span key={initial} className='app-intro-avatar'>
            {initial}
          </span>
        ))}
      </div>
      <SnippetRowView name='지리산 화대종주' metas={['멤버 3명', '배낭 3개']} />
    </div>
  );
};

export default GroupSnippetView;

import { FC } from 'react';

// 커뮤니티: 카드 한 장 + 메타(AppIntroSpec §3.3). 면은 연회색 채움·그림자 없음.
const CommunitySnippetView: FC = () => {
  return (
    <div className='app-intro-surface app-intro-community'>
      <p className='app-intro-row-name'>첫 가을 백패킹, 배낭 봐 주세요</p>
      <p className='app-intro-row-meta'>
        고대산 · <span className='app-intro-number'>8.8kg</span> · 장비 17개
      </p>
    </div>
  );
};

export default CommunitySnippetView;

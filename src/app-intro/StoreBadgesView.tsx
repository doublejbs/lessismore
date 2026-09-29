import { FC } from 'react';
import { APP_STORE_URL, PLAY_STORE_URL } from '../utils/AppSchemeLink';

interface Props {
  isCompact?: boolean;
}

// App Store / Google Play 공식 한국어 배지 두 개. 같은 탭으로 이동한다(AppIntroSpec §5).
// 배지는 브랜드 규정상 색·비율·여백을 바꾸지 않는다 — 크기와 두 배지의 보이는 높이만 CSS로 맞춘다(§4).
const StoreBadgesView: FC<Props> = ({ isCompact = false }) => {
  const className = isCompact
    ? 'app-intro-store-badges app-intro-store-badges--compact'
    : 'app-intro-store-badges';

  return (
    <div className={className}>
      <a className='app-intro-store-badge' href={APP_STORE_URL}>
        <img
          className='app-intro-store-badge-apple'
          src='/app-intro/app-store-badge-ko.svg'
          alt='App Store에서 다운로드 하기'
          width={130}
          height={40}
        />
      </a>
      <a className='app-intro-store-badge' href={PLAY_STORE_URL}>
        <img
          className='app-intro-store-badge-google'
          src='/app-intro/google-play-badge-ko.png'
          alt='Google Play에서 다운로드'
          width={646}
          height={250}
        />
      </a>
    </div>
  );
};

export default StoreBadgesView;

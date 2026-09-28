import { FC } from 'react';

// 앱 스크린샷 원본 크기(iPhone 17 화면에서 상단 상태바를 잘라 낸 것, 720px 폭). width/height 속성으로 비율을 먼저 잡아 레이아웃 이동을 막는다.
const SCREENSHOT_WIDTH = 720;
const SCREENSHOT_HEIGHT = 1476;

interface Props {
  label: string;
  title: string;
  description: string;
  screenshotName: string;
  screenshotAlt: string;
  isFirst?: boolean;
  isCropped?: boolean;
}

// 핵심 기능 한 칸: 기능 이름 · 제목 한 줄 · 설명 한 줄 + 실제 앱 스크린샷(AppIntroSpec §3.3·§4).
// 아래가 비어 있는 화면은 isCropped로 위쪽만 보여 준다.
const AppIntroFeatureView: FC<Props> = ({
  label,
  title,
  description,
  screenshotName,
  screenshotAlt,
  isFirst = false,
  isCropped = false,
}) => {
  const screenshotClassName = isCropped
    ? 'app-intro-screenshot app-intro-screenshot--cropped'
    : 'app-intro-screenshot';

  return (
    <section className='app-intro-feature'>
      <div className='app-intro-feature-text'>
        <p className='app-intro-feature-label'>{label}</p>
        <h2 className='app-intro-feature-title'>{title}</h2>
        <p className='app-intro-feature-description'>{description}</p>
      </div>
      <div className='app-intro-feature-media'>
        <img
          className={screenshotClassName}
          src={`/app-intro/${screenshotName}.webp`}
          alt={screenshotAlt}
          width={SCREENSHOT_WIDTH}
          height={SCREENSHOT_HEIGHT}
          loading={isFirst ? 'eager' : 'lazy'}
          decoding='async'
        />
      </div>
    </section>
  );
};

export default AppIntroFeatureView;

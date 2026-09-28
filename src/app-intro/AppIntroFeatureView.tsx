import { FC, ReactNode } from 'react';

interface Props {
  label: string;
  title: string;
  description: string;
  children: ReactNode;
}

// 핵심 기능 한 칸: 기능 이름 · 제목 한 줄 · 설명 한 줄 + 앱 문법으로 그린 UI 조각(AppIntroSpec §3.3).
const AppIntroFeatureView: FC<Props> = ({ label, title, description, children }) => {
  return (
    <section className='app-intro-feature'>
      <div className='app-intro-feature-text'>
        <p className='app-intro-feature-label'>{label}</p>
        <h2 className='app-intro-feature-title'>{title}</h2>
        <p className='app-intro-feature-description'>{description}</p>
      </div>
      <div className='app-intro-feature-snippet' aria-hidden='true'>
        {children}
      </div>
    </section>
  );
};

export default AppIntroFeatureView;

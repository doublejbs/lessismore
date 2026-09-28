import { FC, useEffect } from 'react';
import AppIntroClosingView from './AppIntroClosingView';
import AppIntroFeatureView from './AppIntroFeatureView';
import AppIntroFooterView from './AppIntroFooterView';
import AppIntroHeaderView from './AppIntroHeaderView';
import AppIntroHeroView from './AppIntroHeroView';
import './AppIntroView.css';

const PAGE_TITLE = 'useless — 백패킹·캠핑 장비 관리';
const PAGE_DESCRIPTION =
  '필요한 장비만, 배낭은 가볍게. 장비 무게를 정리하고 여행을 준비하는 백패킹 앱.';

// 앱 소개 페이지(`/`, AppIntroSpec). 정적 페이지 — Firestore·로그인을 쓰지 않고 자동 이동도 없다.
const AppIntroView: FC = () => {
  // 다른 페이지의 제목·설명을 건드리지 않도록 떠날 때 원래 값으로 되돌린다.
  useEffect(() => {
    const descriptionMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousTitle = document.title;
    const previousDescription = descriptionMeta?.content ?? '';

    document.title = PAGE_TITLE;

    if (descriptionMeta) {
      descriptionMeta.content = PAGE_DESCRIPTION;
    }

    return () => {
      document.title = previousTitle;

      if (descriptionMeta) {
        descriptionMeta.content = previousDescription;
      }
    };
  }, []);

  return (
    <div className='app-intro'>
      <AppIntroHeaderView />
      <main>
        <AppIntroHeroView />
        <div className='app-intro-inner app-intro-features'>
          <AppIntroFeatureView
            label='창고'
            title='내 장비를 무게로 정리'
            description='가진 장비를 담으면 무게·브랜드·카테고리로 한눈에 보여요.'
            screenshotName='warehouse'
            screenshotAlt='창고 화면 — 장비를 무게·브랜드·카테고리로 정리'
            isFirst
          />
          <AppIntroFeatureView
            label='여행'
            title='여행마다 배낭을 꾸려요'
            description='날짜와 여행지를 정하고 장비를 담으면 총 무게와 날씨를 함께 보여 줘요.'
            screenshotName='trip'
            screenshotAlt='여행 화면 — 총 무게 5.36kg, 카테고리별 무게 비율, 여행지 날씨'
          />
          <AppIntroFeatureView
            label='패킹'
            title='출발 전 빠짐없이'
            description='챙긴 장비를 하나씩 체크해요.'
            screenshotName='packing'
            screenshotAlt='패킹 화면 — 9/10 진행 막대와 장비별 체크 목록'
          />
          <AppIntroFeatureView
            label='그룹'
            title='함께 가는 여행'
            description='일행을 초대해 서로의 배낭과 코스(GPX)·지도 포인트를 나눠요.'
            screenshotName='group'
            screenshotAlt='그룹 지도 화면 — 지리산 성중종주 코스와 물보급 포인트'
          />
          <AppIntroFeatureView
            label='박지'
            title='어디서 하룻밤 보낼지'
            description='전국의 백패킹 박지·대피소·캠핑장을 지도에서 찾아보세요.'
            screenshotName='explore'
            screenshotAlt='박지 지도 화면 — 백패킹·대피소·캠핑장 위치를 유형별로 표시'
          />
          <AppIntroFeatureView
            label='커뮤니티'
            title='패킹 후기와 질문'
            description='다른 사람의 배낭을 보고 의견을 나눠요.'
            screenshotName='community'
            screenshotAlt='커뮤니티 화면 — 산행 사진과 고대산 · 8.8kg · 장비 17개 글'
            isCropped
          />
        </div>
        <AppIntroClosingView />
      </main>
      <AppIntroFooterView />
    </div>
  );
};

export default AppIntroView;

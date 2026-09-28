import { FC, useEffect, useState } from 'react';
import AppIntroClosingView from './AppIntroClosingView';
import AppIntroFeatureView from './AppIntroFeatureView';
import AppIntroFooterView from './AppIntroFooterView';
import AppIntroHeaderView from './AppIntroHeaderView';
import AppIntroHeroView from './AppIntroHeroView';
import DevicePlatform from './model/DevicePlatform';
import CommunitySnippetView from './snippet/CommunitySnippetView';
import ExploreSnippetView from './snippet/ExploreSnippetView';
import GroupSnippetView from './snippet/GroupSnippetView';
import PackingSnippetView from './snippet/PackingSnippetView';
import TripSnippetView from './snippet/TripSnippetView';
import WarehouseSnippetView from './snippet/WarehouseSnippetView';
import './AppIntroView.css';

const PAGE_TITLE = 'useless — 백패킹·캠핑 장비 관리';
const PAGE_DESCRIPTION =
  '필요한 장비만, 배낭은 가볍게. 장비 무게를 정리하고 여행을 준비하는 백패킹 앱.';

// 앱 소개 페이지(`/`, AppIntroSpec). 정적 페이지 — Firestore·로그인을 쓰지 않고 자동 이동도 없다.
const AppIntroView: FC = () => {
  const [platform] = useState(() => DevicePlatform.from(navigator.userAgent));

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
      <AppIntroHeaderView platform={platform} />
      <main>
        <AppIntroHeroView platform={platform} />
        <div className='app-intro-inner app-intro-features'>
          <AppIntroFeatureView
            label='창고'
            title='내 장비를 무게로 정리'
            description='가진 장비를 담으면 무게·브랜드·카테고리로 한눈에 보여요.'
          >
            <WarehouseSnippetView />
          </AppIntroFeatureView>
          <AppIntroFeatureView
            label='여행'
            title='여행마다 배낭을 꾸려요'
            description='날짜와 여행지를 정하고 장비를 담으면 총 무게와 날씨를 함께 보여 줘요.'
          >
            <TripSnippetView />
          </AppIntroFeatureView>
          <AppIntroFeatureView
            label='패킹'
            title='출발 전 빠짐없이'
            description='챙긴 장비를 하나씩 체크해요.'
          >
            <PackingSnippetView />
          </AppIntroFeatureView>
          <AppIntroFeatureView
            label='그룹'
            title='함께 가는 여행'
            description='일행을 초대해 서로의 배낭과 코스(GPX)·지도 포인트를 나눠요.'
          >
            <GroupSnippetView />
          </AppIntroFeatureView>
          <AppIntroFeatureView
            label='박지·탐색'
            title='어디로 갈지, 무엇을 살지'
            description='박지 정보와 인기 장비를 둘러봐요.'
          >
            <ExploreSnippetView />
          </AppIntroFeatureView>
          <AppIntroFeatureView
            label='커뮤니티'
            title='패킹 후기와 질문'
            description='다른 사람의 배낭을 보고 의견을 나눠요.'
          >
            <CommunitySnippetView />
          </AppIntroFeatureView>
        </div>
        <AppIntroClosingView platform={platform} />
      </main>
      <AppIntroFooterView />
    </div>
  );
};

export default AppIntroView;

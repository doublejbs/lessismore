import { observer } from 'mobx-react-lite';
import { useEffect, useMemo } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import app from './App.ts';
import LoadingView from './LoadingView.tsx';
import AlertView from './alert/AlertView';
import LogInView from './alert/login/LogInView';
import AppInstallView from './app-install/AppInstallView';
import AppIntroView from './app-intro/AppIntroView';
import BagShareWrapper from './bag-share/component/BagShareWrapper.tsx';
import CampShareWrapper from './camp-share/component/CampShareWrapper.tsx';
import GearShareWrapper from './gear-share/component/GearShareWrapper.tsx';
import GroupInviteWrapper from './group-invite/component/GroupInviteWrapper.tsx';
import CelebrateView from './celebrate/CelebrateView';
import AndroidAppBannerView from './components/AndroidAppBannerView';
import ManageView from './manage/ManageView';
import LogIn from './LogIn';
import InfoView from './info/InfoView';
import InfoDeleteView from './info/InfoDeleteView';
import TermsAgreement from './TermsAgreement';
import AnnouncementAdminView from './announcement/AnnouncementAdminView';
import AdminView from './AdminView';
import PrivacyPolicyView from './policy/PrivacyPolicyView';

const ROUTES = [
  // 앱 소개 페이지(AppIntroSpec). 자동 이동 없음 — 스토어 개발자 웹사이트가 가리키는 첫 화면이다.
  { path: '/', element: <AppIntroView /> },
  {
    path: '/bag-share/:id',
    element: <BagShareWrapper />,
  },
  {
    path: '/camp-share/:id',
    element: <CampShareWrapper />,
  },
  {
    path: '/gear-share/:id',
    element: <GearShareWrapper />,
  },
  {
    // 그룹 초대 랜딩(GRP-3). 앱 `getGroupInviteUrl()`이 만드는 /group/{groupId}와의 계약이다.
    path: '/group/:id',
    element: <GroupInviteWrapper />,
  },
  { path: '/manage', element: <ManageView /> },
  { path: '/announcement', element: <AnnouncementAdminView /> },
  { path: '/admin', element: <AdminView /> },
  { path: '/celebrate', element: <CelebrateView /> },
  { path: '/app-install', element: <AppInstallView /> },
  { path: '/login', element: <LogIn /> },
  { path: '/info', element: <InfoView /> },
  { path: '/info/delete', element: <InfoDeleteView /> },
  { path: '/terms-agreement', element: <TermsAgreement /> },
  { path: '/privacy', element: <PrivacyPolicyView /> },
  { path: '*', element: <Navigate to='/app-install' replace /> },
];

const App = () => {
  const location = useLocation();
  const isInitialized = app.isInitialized();
  const alertManager = app.getAlertManager();
  const logInAlertManager = app.getLogInAlertManager();

  // pathname만 메모이제이션하여 쿼리 파라미터 변경 시 리렌더링 방지
  const pathname = useMemo(() => location.pathname, [location.pathname]);

  useEffect(() => {
    if (!isInitialized) {
      app.initialize();
    }
  }, [isInitialized]);

  if (isInitialized) {
    // 앱 설치 배너를 숨길 페이지 — 개인정보처리방침(/privacy)은 심사용 문서라 상단 라벨을 가리면 안 됨.
    // 앱 소개(/)는 스토어 버튼을 직접 두므로 배너가 머리를 가리지 않게 숨긴다(AppIntroSpec §2).
    const isBannerHiddenPage =
      pathname === '/' || pathname === '/app-install' || pathname === '/privacy';

    return (
      <>
        {!isBannerHiddenPage && <AndroidAppBannerView />}
        <Routes>
          {ROUTES.map(({ path, element }) => (
            <Route key={path} path={path} element={element} />
          ))}
        </Routes>
        <AlertView alertManager={alertManager} />
        <LogInView logInAlertManager={logInAlertManager} />
      </>
    );
  } else {
    return (
      <div style={{ height: '100vh' }}>
        <LoadingView />
      </div>
    );
  }
};

export default observer(App);

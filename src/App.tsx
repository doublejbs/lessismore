import { observer } from 'mobx-react-lite';
import { useEffect, useMemo } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import app from './App.ts';
import LoadingView from './LoadingView.tsx';
import AlertView from './alert/AlertView';
import LogInView from './alert/login/LogInView';
import AppInstallView from './app-install/AppInstallView';
import BagShareWrapper from './bag-share/component/BagShareWrapper.tsx';
import CampShareWrapper from './camp-share/component/CampShareWrapper.tsx';
import GearShareWrapper from './gear-share/component/GearShareWrapper.tsx';
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
    // 앱 설치 배너를 숨길 페이지 — 개인정보처리방침(/privacy)은 심사용 문서라 상단 라벨을 가리면 안 됨
    const isBannerHiddenPage = pathname === '/app-install' || pathname === '/privacy';

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

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
import CelebrateView from './celebrate/CelebrateView';
import AndroidAppBannerView from './components/AndroidAppBannerView';
import ManageView from './manage/ManageView';

const ROUTES = [
  {
    path: '/bag-share/:id',
    element: <BagShareWrapper />,
  },
  { path: '/manage', element: <ManageView /> },
  { path: '/celebrate', element: <CelebrateView /> },
  { path: '/app-install', element: <AppInstallView /> },
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
    const isAppInstallPage = pathname === '/app-install';

    return (
      <>
        {!isAppInstallPage && <AndroidAppBannerView />}
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

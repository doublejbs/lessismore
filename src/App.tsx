import { observer } from 'mobx-react-lite';
import { useEffect, useState, useMemo } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import AdminView from './AdminView.tsx';
import './App.css';
import app from './App.ts';
import InstagramWebView from './InstagramWebView.tsx';
import LoadingView from './LoadingView.tsx';
import LogIn from './LogIn.tsx';
import TermsAgreement from './TermsAgreement.tsx';
import AlertView from './alert/AlertView';
import LogInView from './alert/login/LogInView';
import BagDetailWrapper from './bag-detail/BagDetailWrapper.tsx';
import BagShareWrapper from './bag-share/component/BagShareWrapper.tsx';
import BagView from './bag/component/BagView';
import CelebrateView from './celebrate/CelebrateView';
import CustomGearWrapper from './custom-gear/component/CustomGearWrapper';
import GearEditWrapperView from './gear-edit/component/GearEditWrapperView';
import InfoView from './info/InfoView';
import ManageView from './manage/ManageView';
import OpenBrowserView from './open-browser/OpenBrowserView.tsx';
import SearchWarehouseWrapper from './search-warehouse/component/SearchWarehouseWrapper.tsx';
import WarehouseWrapper from './warehouse/component/WarehouseWrapper.tsx';
import WarehouseWebViewDetailWrapper from './warehouse-detail/component/WarehouseWebViewDetailWrapper';
import BagEditWebViewWrapper from './bag-edit-add-gear/BagEditWebViewWrapper';
import BagUselessWebViewWrapper from './bag-useless/component/BagUselessWebViewWrapper';
import InfoDeleteView from './info/InfoDeleteView';

const ROUTES = [
  {
    path: '/',
    element: <WarehouseWrapper />,
  },
  {
    path: '/login',
    element: <LogIn />,
  },
  {
    path: '/terms-agreement',
    element: <TermsAgreement />,
  },
  {
    path: '/bag-share/:id',
    element: <BagShareWrapper />,
  },
  {
    path: '/bag/:id/useless',
    element: <BagUselessWebViewWrapper />,
  },
  {
    path: '/bag/:id/edit',
    element: <BagEditWebViewWrapper />,
  },
  {
    path: '/bag/:id',
    element: <BagDetailWrapper />,
  },
  {
    path: '/bag',
    element: <BagView />,
  },
  { path: '/warehouse', element: <WarehouseWrapper /> },
  {
    path: '/warehouse/detail/:id',
    element: <WarehouseWebViewDetailWrapper />,
  },
  {
    path: '/warehouse/custom',
    element: <CustomGearWrapper />,
  },
  {
    path: '/gear/edit/:id',
    element: <GearEditWrapperView />,
  },
  { path: '/admin', element: <AdminView /> },
  { path: '/search', element: <SearchWarehouseWrapper /> },
  { path: '/manage', element: <ManageView /> },
  { path: '/info', element: <InfoView /> },
  { path: '/info/delete', element: <InfoDeleteView /> },
  { path: '/open-browser', element: <OpenBrowserView /> },
  { path: '/celebrate', element: <CelebrateView /> },
];

const App = () => {
  const firebase = app.getFirebase();
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = firebase.isLoggedIn();
  const hasAgreed = firebase.hasUserAgreedToTerms();
  const isInitialized = app.isInitialized();
  const alertManager = app.getAlertManager();
  const logInAlertManager = app.getLogInAlertManager();
  const [isInstagram, setIsInstagram] = useState(false);

  // pathname만 메모이제이션하여 쿼리 파라미터 변경 시 리렌더링 방지
  const pathname = useMemo(() => location.pathname, [location.pathname]);

  useEffect(() => {
    if (isInitialized) {
      const ua = navigator.userAgent.toLowerCase();

      if (ua.includes('instagram') || ua.includes('fbav')) {
        setIsInstagram(true);
      } else {
        if (isLoggedIn) {
          if (hasAgreed) {
            if (pathname === '/login' || pathname === '/' || pathname === '/terms-agreement') {
              navigate('/warehouse', { replace: true });
            }
          } else {
            if (pathname !== '/terms-agreement') {
              navigate('/terms-agreement', { replace: true });
            }
          }
        }
      }
    } else {
      app.initialize();
    }
  }, [isInitialized, pathname, isLoggedIn, hasAgreed]); // location.pathname 대신 pathname 사용

  if (isInstagram) {
    return <InstagramWebView />;
  } else if (isInitialized) {
    return (
      <>
        <Routes>
          {ROUTES.map(({ path, element }) => {
            if (path === '/terms-agreement') {
              return <Route key={path} path={path} element={<TermsAgreement />} />;
            }

            return <Route key={path} path={path} element={element} />;
          })}
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

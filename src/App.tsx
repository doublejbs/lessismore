import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
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
import BagEditAddGearView from './bag-edit-add-gear/BagEditView.tsx';
import BagShareWrapper from './bag-share/component/BagShareWrapper.tsx';
import BagUselessView from './bag-useless/component/BagUselessView';
import BagView from './bag/component/BagView';
import CustomGearWrapper from './custom-gear/component/CustomGearWrapper';
import GearEditWrapperView from './gear-edit/component/GearEditWrapperView';
import InfoView from './info/InfoView';
import ManageView from './manage/ManageView';
import OpenBrowserView from './open-browser/OpenBrowserView.tsx';
import SearchWarehouseWrapper from './search-warehouse/component/SearchWarehouseWrapper.tsx';
import WarehouseDetailWrapper from './warehouse-detail/component/WarehouseDetailWrapper';
import WarehouseWrapper from './warehouse/component/WarehouseWrapper.tsx';

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
    element: <BagUselessView />,
  },
  {
    path: '/bag/:id/edit',
    element: <BagEditAddGearView />,
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
    element: <WarehouseDetailWrapper />,
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
  { path: '/open-browser', element: <OpenBrowserView /> },
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

  useEffect(() => {
    if (isInitialized) {
      const ua = navigator.userAgent.toLowerCase();

      if (ua.includes('instagram') || ua.includes('fbav')) {
        setIsInstagram(true);
      } else {
        if (isLoggedIn) {
          if (hasAgreed) {
            if (
              location.pathname === '/login' ||
              location.pathname === '/' ||
              location.pathname === '/terms-agreement'
            ) {
              navigate('/warehouse', { replace: true });
            }
          } else {
            if (location.pathname !== '/terms-agreement') {
              navigate('/terms-agreement', { replace: true });
            }
          }
        }
      }
    } else {
      app.initialize();
    }
  }, [isLoggedIn, isInitialized, location.pathname, hasAgreed]);

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

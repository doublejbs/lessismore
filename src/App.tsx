import { observer } from 'mobx-react-lite';
import './App.css';
import app from './App.ts';
import InstagramWebView from './InstagramWebView.tsx';
import LoadingView from './LoadingView.tsx';
import AlertView from './alert/AlertView';
import LogInView from './alert/login/LogInView';
import BagView from './bag/component/BagView';
import WarehouseWrapper from './warehouse/component/WarehouseWrapper.tsx';
import { Stack } from './Stackflow.ts';
import ContentView from './ContentView.tsx';
import { useEffect } from 'react';

const ROUTES = [
  // {
  //   path: '/',
  //   element: <WarehouseWrapper />,
  // },
  // {
  //   path: '/login',
  //   element: <LogIn />,
  // },
  // {
  //   path: '/terms-agreement',
  //   element: <TermsAgreement />,
  // },
  // {
  //   path: '/bag-share/:id',
  //   element: <BagShareWrapper />,
  // },
  // {
  //   path: '/bag/:id/useless',
  //   element: <BagUselessWebViewWrapper />,
  // },
  // {
  //   path: '/bag/:id/edit',
  //   element: <BagEditWebViewWrapper />,
  // },
  // {
  //   path: '/bag/:id',
  //   element: <BagDetailWrapper />,
  // },

  // {
  //   path: '/warehouse/detail/:id',
  //   element: <WarehouseWebViewDetailWrapper />,
  // },
  // {
  //   path: '/warehouse/custom',
  //   element: <CustomGearWrapper />,
  // },
  // {
  //   path: '/gear/edit/:id',
  //   element: <GearEditWrapperView />,
  // },
  // { path: '/admin', element: <AdminView /> },
  // { path: '/search', element: <SearchWarehouseWrapper /> },
  // { path: '/manage', element: <ManageView /> },
  // { path: '/info', element: <InfoView /> },
  // { path: '/open-browser', element: <OpenBrowserView /> },
  // { path: '/celebrate', element: <CelebrateView /> },
  {
    path: '/bag',
    element: <BagView />,
  },
  { path: '/warehouse', element: <WarehouseWrapper /> },
];

const App = () => {
  const isInitialized = app.isInitialized();
  const alertManager = app.getAlertManager();
  const logInAlertManager = app.getLogInAlertManager();
  const ua = navigator.userAgent.toLowerCase();
  const isInstagram = ua.includes('instagram') || ua.includes('fbav');

  useEffect(() => {
    app.initialize();
  }, []);

  if (isInstagram) {
    return <InstagramWebView />;
  } else if (isInitialized) {
    return (
      <>
        <Stack />
        <ContentView />
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

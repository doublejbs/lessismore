import React, { useEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import './App.css';
import LogIn from './LogIn.tsx';
import Join from './Join.tsx';
import { observer } from 'mobx-react-lite';
import app from './App.ts';
import WarehouseWrapper from './warehouse/component/WarehouseWrapper.tsx';
import AdminView from './AdminView.tsx';
import LoadingView from './LoadingView.tsx';
import BagView from './bag/component/BagView';
import BagEditWrapper from './bag/component/BagEditWrapper';
import BagEditAddGearView from './bag-edit/BagEditAddGearView.tsx';
import BagEditSearchWarehouseView from './bag-edit-search/BagEditSearchWarehouseView';
import AlertView from './alert/AlertView';
import CustomGearWrapper from './custom-gear/component/CustomGearWrapper';
import WarehouseDetailWrapper from './warehouse-detail/component/WarehouseDetailWrapper';
import GearEditWrapperView from './gear-edit/component/GearEditWrapperView';
import SearchWarehouseView from './search-warehouse/component/SearchWarehouseView';

const ROUTES = [
  {
    path: '/login',
    element: <LogIn />,
  },
  {
    path: '/join',
    element: <Join />,
  },
  {
    path: 'bag/:id/edit/search',
    element: <BagEditSearchWarehouseView />,
  },
  {
    path: '/bag/:id/edit',
    element: <BagEditAddGearView />,
  },
  {
    path: '/bag/:id',
    element: <BagEditWrapper />,
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
  { path: '/search', element: <SearchWarehouseView /> },
];

const App = () => {
  const firebase = app.getFirebase();
  const navigate = useNavigate();
  const isLoggedIn = firebase.isLoggedIn();
  const isInitialized = app.isInitialized();
  const alertManager = app.getAlertManager();

  useEffect(() => {
    if (isInitialized) {
      if (isLoggedIn) {
        if (location.pathname === '/login' || location.pathname === '/') {
          navigate('/warehouse', { replace: true });
        }
      } else {
        navigate('/login');
      }
    } else {
      app.initialize();
    }
  }, [isLoggedIn, isInitialized]);

  if (isInitialized) {
    return (
      <>
        <Routes>
          {ROUTES.map(({ path, element }) => (
            <Route key={path} path={path} element={element} />
          ))}
        </Routes>
        <AlertView alertManager={alertManager} />
      </>
    );
  } else {
    return <LoadingView />;
  }
};

export default observer(App);

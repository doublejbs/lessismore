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
import SearchWarehouseView from './search-warehouse/component/SearchWarehouseView';
import BagView from './bag/component/BagView';
import BagEditWrapper from './bag/component/BagEditWrapper';
import BagEditAddGearView from './bag/component/BagEditAddGearView.tsx';

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
  { path: '/admin', element: <AdminView /> },
  { path: '/search', element: <SearchWarehouseView /> },
];

const App = () => {
  const firebase = app.getFirebase();
  const navigate = useNavigate();
  const isLoggedIn = firebase.isLoggedIn();
  const isInitialized = app.isInitialized();

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
      <Routes>
        {ROUTES.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}
      </Routes>
    );
  } else {
    return <LoadingView />;
  }
};

export default observer(App);

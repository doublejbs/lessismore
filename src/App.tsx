import React, { useEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import './App.css';
import LogIn from './LogIn.tsx';
import Join from './Join.tsx';
import { observer } from 'mobx-react-lite';
import BagView from './bag/BagView.tsx';
import app from './App.ts';
import WarehouseWrapper from './warehouse/WarehouseWrapper.tsx';
import BagEditView from './bag/BagEditView.tsx';
import AdminView from './AdminView.tsx';
import CrawlView from './CrawlView.tsx';
import LoadingView from './LoadingView.tsx';
import SearchWarehouseView from './search-warehouse/SearchWarehouseView';
import WarehouseEditView from './warehouse/edit/WarehouseEditView.tsx';

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
    path: '/bag/:id',
    element: <BagEditView />,
  },
  {
    path: '/bag',
    element: <BagView />,
  },
  {
    path: '/warehouse/edit',
    element: <WarehouseEditView />,
  },
  { path: '/warehouse', element: <WarehouseWrapper /> },
  { path: '/admin', element: <AdminView /> },
  { path: '/crawler', element: <CrawlView /> },
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

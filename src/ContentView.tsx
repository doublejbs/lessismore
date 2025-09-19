import { useFlow } from '@stackflow/react/future';
import app from './App';
import { useEffect } from 'react';
import { useMemo } from 'react';
import { observer } from 'mobx-react-lite';

const ContentView = () => {
  const location = window.location;
  const firebase = app.getFirebase();
  const isInitialized = app.isInitialized();
  const isLoggedIn = firebase.isLoggedIn();
  const hasAgreed = firebase.hasUserAgreedToTerms();
  const pathname = useMemo(() => location.pathname, [location.pathname]);
  const { replace, push } = useFlow();

  useEffect(() => {
    if (isInitialized) {
      if (isLoggedIn) {
        if (hasAgreed) {
          if (pathname === '/login/' || pathname === '/' || pathname === '/terms-agreement/') {
            replace('WarehouseWrapper', {});
          }
        } else {
          if (pathname !== '/terms-agreement/') {
            console.log('here');
            window.location.href = '/terms-agreement/';
            // push('BagView', {});
          }
        }
      }
    }
  }, [isInitialized, pathname, isLoggedIn, hasAgreed]); // location.pathname 대신 pathname 사용

  return <></>;
};

export default observer(ContentView);

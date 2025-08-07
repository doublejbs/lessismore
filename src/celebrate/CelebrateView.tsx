import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import app from '../App';
import Celebrate from './model/Celebrate';
import Layout from '../Layout';
import SVGFireworks from './components/SVGFireworks';

interface Props {}

const CelebrateView = observer(({}: Props) => {
  const firebase = app.getFirebase();
  const [celebrate] = useState(() => new Celebrate(firebase));
  const [showFireworks, setShowFireworks] = useState(false);
  const [hasShownFireworks, setHasShownFireworks] = useState(false);

  useEffect(() => {
    celebrate.fetchUserCount();

    // 처음 접근했을 때만 폭죽 효과 실행
    if (!hasShownFireworks) {
      const timer = setTimeout(() => {
        setShowFireworks(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [hasShownFireworks]);

  const handleFireworksComplete = () => {
    setShowFireworks(false);
    setHasShownFireworks(true);
  };

  return (
    <>
      <SVGFireworks isActive={showFireworks} onComplete={handleFireworksComplete} />
      <Layout vh={true}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginTop: '8px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              fontWeight: '1000',
              fontSize: '48px',
              textAlign: 'center',
              display: 'inline-block',
              lineHeight: 1,
              letterSpacing: '-4.5px',
            }}
          >
            useless
          </div>
        </div>

        <div
          style={{
            width: '100%',
            height: '100%',
            paddingBottom: '53px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {celebrate.getIsLoading ? (
            <div
              style={{
                height: '100%',
                fontSize: '30px',
                fontWeight: 'bold',
                position: 'relative',
              }}
            >
              <span style={{ position: 'absolute', top: '30%', left: '0' }}>
                사용자 수
                <br />
                조회 중...
              </span>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '16px',
                width: '100%',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '48px',
                    fontWeight: 'bold',
                    color: '#000',
                    marginBottom: '8px',
                    lineHeight: '1',
                  }}
                >
                  {celebrate.getUserCount - 20 || '0'}
                </div>
                <p
                  style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#666',
                    margin: '0',
                  }}
                >
                  총 사용자 수
                </p>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
});

export default CelebrateView;

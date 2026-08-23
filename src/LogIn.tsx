import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import App from './App';

const LogIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const firebase = App.getFirebase();

  const navigateAfterLogIn = () => {
    const from = (location.state as { from?: string } | null)?.from;

    if (firebase.hasUserAgreedToTerms()) {
      navigate(from ?? '/info', { replace: true });
    } else {
      navigate('/terms-agreement', { replace: true, state: { from } });
    }
  };

  const handleLogInError = (e: unknown) => {
    const code = (e as { code?: string } | null)?.code;

    if (
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/user-cancelled'
    ) {
      return;
    }

    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/user-not-found'
    ) {
      setErrorMessage('이메일 또는 비밀번호가 올바르지 않습니다.');
    } else if (code === 'auth/account-exists-with-different-credential') {
      setErrorMessage('이미 다른 방식으로 가입된 이메일입니다. 기존 로그인 방식을 이용해주세요.');
    } else if (code === 'auth/popup-blocked') {
      setErrorMessage('팝업이 차단되었습니다. 브라우저의 팝업 차단을 해제한 뒤 다시 시도해주세요.');
    } else if (code === 'auth/operation-not-allowed') {
      setErrorMessage('현재 사용할 수 없는 로그인 방식입니다.');
    } else {
      setErrorMessage(e instanceof Error ? e.message : '로그인 중 오류가 발생했습니다.');
    }

    setShowError(true);
  };

  const handleClickGoogle = async () => {
    setShowError(false);

    try {
      await firebase.logInWithGoogle();

      navigateAfterLogIn();
    } catch (e) {
      handleLogInError(e);
    }
  };

  const handleClickApple = async () => {
    setShowError(false);

    try {
      await firebase.logInWithApple();

      navigateAfterLogIn();
    } catch (e) {
      handleLogInError(e);
    }
  };

  const handleSubmitEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setShowError(false);

    if (!email || !password) {
      setErrorMessage('이메일과 비밀번호를 입력해주세요.');
      setShowError(true);

      return;
    }

    try {
      await firebase.login(email, password);

      navigateAfterLogIn();
    } catch (e) {
      handleLogInError(e);
    }
  };

  const oAuthButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '280px',
    boxSizing: 'border-box',
    backgroundColor: 'black',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.3s',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '32px',
      }}
    >
      <div
        style={{
          fontSize: '64px',
          fontWeight: 'bold',
          letterSpacing: '-7px',
        }}
      >
        <span>useless</span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          width: '280px',
        }}
      >
        {showError && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#FEE2E2',
              color: '#B91C1C',
              borderRadius: '6px',
              width: '100%',
              boxSizing: 'border-box',
              textAlign: 'center',
            }}
          >
            {errorMessage}
          </div>
        )}

        <button style={oAuthButtonStyle} onClick={handleClickGoogle}>
          <svg
            style={{
              width: '24px',
              height: '24px',
              marginRight: '10px',
            }}
            viewBox='0 0 24 24'
          >
            <path
              fill='#4285F4'
              d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
            />
            <path
              fill='#34A853'
              d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
            />
            <path
              fill='#FBBC05'
              d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
            />
            <path
              fill='#EA4335'
              d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
            />
          </svg>
          <span>Google로 로그인</span>
        </button>

        <button style={oAuthButtonStyle} onClick={handleClickApple}>
          <svg
            style={{
              width: '24px',
              height: '24px',
              marginRight: '10px',
            }}
            viewBox='0 0 24 24'
          >
            <path
              fill='white'
              d='M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11'
            />
          </svg>
          <span>Apple로 로그인</span>
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
          }}
        >
          <div style={{ flex: 1, height: '1px', backgroundColor: '#eee' }} />
          <span style={{ color: '#999', fontSize: '13px' }}>또는</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#eee' }} />
        </div>

        <form
          onSubmit={handleSubmitEmail}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
          }}
        >
          <input
            type='email'
            placeholder='이메일'
            autoComplete='email'
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={inputStyle}
          />
          <input
            type='password'
            placeholder='비밀번호'
            autoComplete='current-password'
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={inputStyle}
          />
          <button
            type='submit'
            style={{
              width: '100%',
              boxSizing: 'border-box',
              backgroundColor: 'white',
              color: 'black',
              border: '1px solid #ddd',
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background 0.3s',
            }}
          >
            <span>이메일로 로그인</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default LogIn;

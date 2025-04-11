import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import App from './App';

type FieldType = {
  email?: string;
  password?: string;
};

const LogIn = () => {
  const navigate = useNavigate();
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const firebase = App.getFirebase();

  const onFinish = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    try {
      if (email && password) {
        await firebase.login(email, password);
        navigate('/bag');
      }
    } catch (e: any) {
      setErrorMessage(e.message);
      setShowError(true);
    }
  };

  const handleClickGoogle = async () => {
    await firebase.logInWithGoogle();
  };

  const handleClickJoin = () => {
    navigate('/join');
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-around',
        alignItems: 'center',
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
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'black',
          color: 'white',
          border: 'none',
          padding: '12px 20px',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'background 0.3s',
        }}
        onClick={handleClickGoogle}
      >
        <svg
          style={{
            width: '24px',
            height: '24px',
            marginRight: '10px',
          }}
          viewBox="0 0 24 24"
        >
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span>Google로 로그인</span>
      </button>
    </div>
  );
};

export default LogIn;

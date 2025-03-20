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
          viewBox="0 0 48 48"
        >
          <path
            fill="#4285F4"
            d="M24 9.5c3.29 0 6.27 1.17 8.6 3.08l6.4-6.4C34.94 2.24 29.78 0 24 0 14.74 0 6.84 5.42 3 13.28l7.8 6.06C12.14 13.56 17.6 9.5 24 9.5z"
          />
          <path
            fill="#34A853"
            d="M46.08 24.52c0-1.6-.14-3.13-.4-4.6H24v9h12.6c-.58 2.95-2.17 5.44-4.44 7.18l7.1 5.52c4.13-3.82 6.92-9.46 6.92-16.1z"
          />
          <path
            fill="#FBBC05"
            d="M9.3 28.42c-1.17-2.34-1.84-4.95-1.84-7.72s.67-5.38 1.84-7.72L3 13.28C1.1 17 0 20.83 0 24.7s1.1 7.7 3 11.42l6.3-7.7z"
          />
          <path
            fill="#EA4335"
            d="M24 48c6.48 0 11.88-2.14 15.84-5.8l-7.1-5.52c-2 1.38-4.6 2.16-7.7 2.16-6.4 0-11.86-4.06-13.84-9.76l-7.8 6.06C6.84 42.58 14.74 48 24 48z"
          />
        </svg>
        <span>Google로 로그인</span>
      </button>
    </div>
  );
};

export default LogIn;

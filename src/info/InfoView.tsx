import { FC, useState } from 'react';
import Layout from '../Layout';
import Bottom from '../Bottom';
import app from '../App';
import { useNavigate } from 'react-router-dom';
import { PRIVACY_POLICY_TEXT } from '../policy/PrivacyPolicyText';

const InfoView: FC = () => {
  const [open, setOpen] = useState(false);
  const isLoggedIn = app.getFirebase().isLoggedIn();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await app.getFirebase().logout();
    window.location.reload();
  };

  const handleLogin = () => {
    navigate('/login');
  };

  // 버튼 스타일 통일 (테두리 추가)
  const buttonStyle = {
    width: '100%',
    margin: '0',
    padding: '16px',
    background: '#fff',
    border: '1px solid #eee',
    outline: 'none',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    transition: 'background 0.2s',
    borderRadius: 8,
    textAlign: 'left' as const,
  };

  return (
    <Layout>
      <div style={{ padding: '24px 0', fontSize: '20px', fontWeight: 'bold' }}>
        <span>내 정보</span>
      </div>
      {isLoggedIn ? (
        <button
          onClick={handleLogout}
          style={{ ...buttonStyle, margin: '0 0 16px 0' }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f7f7f7')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
        >
          로그아웃
        </button>
      ) : (
        <button
          onClick={handleLogin}
          style={{ ...buttonStyle, margin: '0 0 16px 0' }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f7f7f7')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
        >
          로그인
        </button>
      )}
      <button
        onClick={() => window.open('http://pf.kakao.com/_VJwSn', '_blank')}
        style={{ ...buttonStyle, margin: '0 0 16px 0' }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f7f7f7')}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
      >
        서비스 문의
      </button>
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            borderRadius: 8,
            overflow: 'hidden',
            background: '#fff',
          }}
        >
          <button
            onClick={() => setOpen((prev) => !prev)}
            style={{
              ...buttonStyle,
              borderBottom: open ? '1px solid #eee' : 'none',
              borderRadius: 8,
            }}
            aria-expanded={open}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f7f7f7')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
          >
            개인정보 처리방침
          </button>
          {open && (
            <div
              style={{
                padding: '16px',
                fontSize: '15px',
                whiteSpace: 'pre-line',
                background: '#fff',
              }}
            >
              {PRIVACY_POLICY_TEXT}
            </div>
          )}
        </div>
      </div>
      {/* 로그인/로그아웃 버튼을 Bottom 바로 위에 위치 */}

      {isLoggedIn && (
        <div style={{ textAlign: 'center', marginTop: '16px', paddingBottom: '16px' }}>
          <button
            onClick={() => navigate('/info/delete')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '12px',
              color: '#666',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: '0',
            }}
          >
            탈퇴하기
          </button>
        </div>
      )}

      <Bottom />
    </Layout>
  );
};

export default InfoView;

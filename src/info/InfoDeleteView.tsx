import { FC, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../Layout';
import app from '../App';
import SignInProvider from '../firebase/SignInProvider';

const InfoDeleteView: FC = () => {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!app.getFirebase().isLoggedIn()) {
    return <Navigate to='/login' replace state={{ from: '/info/delete' }} />;
  }

  const handleCancel = () => {
    navigate('/info');
  };

  const handleConfirm = async () => {
    if (isDeleting) return;

    const confirmMessage =
      '정말로 탈퇴하시겠습니까? 모든 데이터가 삭제되며 복구할 수 없습니다.\n\n본인 확인을 위해 재인증이 진행됩니다.';
    if (!window.confirm(confirmMessage)) {
      return;
    }

    let password: string | undefined;

    if (app.getFirebase().getSignInProvider() === SignInProvider.Password) {
      const input = window.prompt('본인 확인을 위해 비밀번호를 입력해주세요.');

      if (!input) {
        return;
      }

      password = input;
    }

    setIsDeleting(true);

    try {
      await app.getFirebase().deleteUserAccount(password);
      alert('회원 탈퇴가 완료되었습니다.');
      window.location.href = '/';
    } catch (error) {
      console.error('회원 탈퇴 실패:', error);

      const code = (error as { code?: string } | null)?.code;

      if (code === 'auth/popup-closed-by-user') {
        alert('재인증이 취소되었습니다. 회원 탈퇴를 진행하려면 재인증이 필요합니다.');
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        alert('비밀번호가 올바르지 않습니다. 다시 시도해주세요.');
      } else {
        alert('회원 탈퇴 중 오류가 발생했습니다. 다시 시도해주세요.');
      }

      setIsDeleting(false);
    }
  };

  return (
    <Layout>
      <div style={{ paddingBottom: '100px' }}>
        <div style={{ padding: '24px 0', fontSize: '20px', fontWeight: 'bold' }}>
          <span>회원 탈퇴</span>
        </div>

        <div
          style={{
            padding: '24px',
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #eee',
            marginBottom: '24px',
          }}
        >
          <div style={{ fontSize: '16px', lineHeight: '1.6', color: '#333' }}>
            <p style={{ marginBottom: '16px', fontWeight: 'bold', color: '#e74c3c' }}>
              ⚠️ 주의사항
            </p>
            <p style={{ marginBottom: '8px' }}>회원 탈퇴 시 모든 데이터가 삭제됩니다.</p>
            <p style={{ marginBottom: '8px', color: '#666' }}>• 저장된 모든 배낭 정보</p>
            <p style={{ marginBottom: '8px', color: '#666' }}>• 저장된 모든 장비 정보</p>
            <p style={{ marginBottom: '8px', color: '#666' }}>• 개인 설정 및 기록</p>
            <p style={{ marginTop: '16px', fontSize: '14px', color: '#999' }}>
              삭제된 데이터는 복구할 수 없습니다.
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px',
          background: '#fff',
          display: 'flex',
          gap: '12px',
          maxWidth: '768px',
          margin: '0 auto',
        }}
      >
        <button
          onClick={handleCancel}
          style={{
            flex: 1,
            padding: '16px',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 8,
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f7f7f7';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#fff';
          }}
        >
          취소
        </button>
        <button
          onClick={handleConfirm}
          disabled={isDeleting}
          style={{
            flex: 1,
            padding: '16px',
            background: isDeleting ? '#ccc' : '#e74c3c',
            border: 'none',
            borderRadius: 8,
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#fff',
            cursor: isDeleting ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            if (!isDeleting) {
              e.currentTarget.style.backgroundColor = '#c0392b';
            }
          }}
          onMouseOut={(e) => {
            if (!isDeleting) {
              e.currentTarget.style.backgroundColor = '#e74c3c';
            }
          }}
        >
          {isDeleting ? '처리중...' : '확인'}
        </button>
      </div>
    </Layout>
  );
};

export default InfoDeleteView;

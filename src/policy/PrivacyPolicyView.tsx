import { FC, useEffect } from 'react';
import { PRIVACY_POLICY_TEXT } from './PrivacyPolicyText';

const PrivacyPolicyView: FC = () => {
  useEffect(() => {
    document.title = 'Useless 개인정보처리방침';
  }, []);

  return (
    <div
      style={{
        maxWidth: '768px',
        margin: '0 auto',
        padding: '24px',
        background: '#fff',
      }}
    >
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
        개인정보처리방침
      </h1>
      <p style={{ fontSize: '14px', color: '#666', margin: '0 0 24px 0' }}>
        시행일: 2026년 8월 24일
      </p>
      <div
        style={{
          whiteSpace: 'pre-line',
          fontSize: '15px',
          lineHeight: 1.7,
          color: '#333',
        }}
      >
        {PRIVACY_POLICY_TEXT}
      </div>
    </div>
  );
};

export default PrivacyPolicyView;

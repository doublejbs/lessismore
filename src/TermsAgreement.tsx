import React, { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import App from './App';
import { doc, updateDoc } from 'firebase/firestore';
import { observer } from 'mobx-react-lite';

const TermsAgreement: FC = () => {
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [marketingAgreed, setMarketingAgreed] = useState(false);
  const [error, setError] = useState('');
  const firebase = App.getFirebase();
  const userId = firebase.getUserId();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!termsAgreed || !privacyAgreed) {
      setError('서비스 이용약관과 개인정보 처리방침에 동의해야 서비스를 이용할 수 있습니다.');
      return;
    }

    try {
      await firebase.termsAgreed(marketingAgreed);
      navigate('/warehouse', { replace: true });
    } catch (error) {
      console.error('약관 동의 저장 오류:', error);
      setError('약관 동의 정보를 저장하는 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // 체크박스 렌더링 함수
  const renderCheckbox = (
    isChecked: boolean,
    onChange: (checked: boolean) => void,
    label: string,
    isRequired: boolean = false
  ) => {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            position: 'relative',
            cursor: 'pointer',
          }}
        >
          <input
            type='checkbox'
            checked={isChecked}
            onChange={(e) => onChange(e.target.checked)}
            style={{
              position: 'absolute',
              opacity: 0,
              width: 0,
              height: 0,
            }}
          />
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              backgroundColor: isChecked ? '#000' : '#fff',
              border: '2px solid #000',
              borderRadius: '4px',
              transition: 'all 0.2s',
            }}
          >
            {isChecked && (
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='white'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <polyline points='20 6 9 17 4 12' />
              </svg>
            )}
          </span>
        </div>
        <span style={{ fontWeight: isChecked ? 'bold' : 'normal' }}>
          {label}
          {isRequired && ' (필수)'}
        </span>
      </label>
    );
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '500px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      <h1 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold' }}>약관 동의</h1>
      {error && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#FEE2E2',
            color: '#B91C1C',
            borderRadius: '6px',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {renderCheckbox(termsAgreed, setTermsAgreed, '서비스 이용약관 동의', true)}

        <div
          style={{
            maxHeight: '150px',
            overflow: 'auto',
            padding: '10px',
            backgroundColor: '#F9FAFB',
            borderRadius: '6px',
            fontSize: '14px',
            marginLeft: '30px',
          }}
        >
          [서비스 이용약관]
          <br />
          <br />
          제1조 (목적)
          <br />
          본 약관은 useless(이하 '회사')가 제공하는 서비스의 이용조건과 운영에 관한 제반 사항을
          규정합니다.
          <br />
          <br />
          제2조 (용어의 정의)
          <br />
          본 약관에서 사용하는 용어의 정의는 다음과 같습니다.
          <br />
          1. '서비스'란 회사가 제공하는 모든 서비스를 의미합니다.
          <br />
          2. '이용자'란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원을 말합니다.
          <br />
          [이하 생략]
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {renderCheckbox(privacyAgreed, setPrivacyAgreed, '개인정보 처리방침 동의', true)}

        <div
          style={{
            maxHeight: '150px',
            overflow: 'auto',
            padding: '10px',
            backgroundColor: '#F9FAFB',
            borderRadius: '6px',
            fontSize: '14px',
            marginLeft: '30px',
          }}
        >
          [개인정보 처리방침]
          <br />
          <br />
          제1조 (개인정보의 처리 목적)
          <br />
          회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적
          이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에
          따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
          <br />
          <br />
          1. 서비스 제공
          <br />
          2. 회원 관리
          <br />
          [이하 생략]
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {renderCheckbox(marketingAgreed, setMarketingAgreed, '마케팅 정보 수신 동의')}

        <div
          style={{
            maxHeight: '100px',
            overflow: 'auto',
            padding: '10px',
            backgroundColor: '#F9FAFB',
            borderRadius: '6px',
            fontSize: '14px',
            marginLeft: '30px',
          }}
        >
          회사가 제공하는 서비스 및 이벤트 정보를 이메일, SMS 등을 통해 수신하는 것에 동의합니다.
        </div>
      </div>

      <button
        onClick={handleSubmit}
        style={{
          backgroundColor: termsAgreed && privacyAgreed ? 'black' : '#CCCCCC',
          color: 'white',
          border: 'none',
          padding: '15px',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: termsAgreed && privacyAgreed ? 'pointer' : 'not-allowed',
          marginTop: '10px',
        }}
        disabled={!termsAgreed || !privacyAgreed}
      >
        동의하고 계속하기
      </button>
    </div>
  );
};

export default observer(TermsAgreement);

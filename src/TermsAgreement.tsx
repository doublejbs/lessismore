import React, { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import App from './App';
import { observer } from 'mobx-react-lite';

const TermsAgreement: FC = () => {
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [marketingAgreed, setMarketingAgreed] = useState(false);
  const [personalInfoAgreed, setPersonalInfoAgreed] = useState(false);
  const [over14Agreed, setOver14Agreed] = useState(false);
  const [smsAgreed, setSmsAgreed] = useState(false);
  const [error, setError] = useState('');
  const firebase = App.getFirebase();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!termsAgreed || !privacyAgreed) {
      setError('서비스 이용약관과 개인정보 처리방침에 동의해야 서비스를 이용할 수 있습니다.');
      return;
    }

    try {
      await firebase.termsAgreed(
        marketingAgreed,
        smsAgreed,
        termsAgreed,
        privacyAgreed,
        personalInfoAgreed,
        over14Agreed
      );
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

  // 전체 동의 체크박스 핸들러
  const handleCheckAllRequired = (checked: boolean) => {
    setTermsAgreed(checked);
    setPrivacyAgreed(checked);
    setPersonalInfoAgreed(checked);
    setOver14Agreed(checked);
  };
  const handleCheckAll = (checked: boolean) => {
    setTermsAgreed(checked);
    setPrivacyAgreed(checked);
    setPersonalInfoAgreed(checked);
    setOver14Agreed(checked);
    setMarketingAgreed(checked);
    setSmsAgreed(checked);
  };
  const allRequiredChecked = termsAgreed && privacyAgreed && personalInfoAgreed && over14Agreed;
  const allChecked = allRequiredChecked && marketingAgreed && smsAgreed;

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
        {renderCheckbox(termsAgreed, setTermsAgreed, '이용약관 동의', true)}

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
          <br />
          제1조 목적
          <br />본 이용약관은 "Useless"(이하 "사이트")의 서비스의 이용조건과 운영에 관한 제반 사항
          규정을 목적으로 합니다.
          <br />
          <br />
          제2조 용어의 정의
          <br />본 약관에서 사용되는 주요한 용어의 정의는 다음과 같습니다.
          <br />① 회원 : 사이트의 약관에 동의하고 개인정보를 제공하여 회원등록을 한 자로서,
          사이트와의 이용계약을 체결하고 사이트를 이용하는 이용자를 말합니다.
          <br />② 이용계약 : 사이트 이용과 관련하여 사이트와 회원간에 체결 하는 계약을 말합니다.
          <br />③ 회원 아이디(이하 "ID") : 회원의 식별과 회원의 서비스 이용을 위하여 회원별로
          부여하는 고유한 문자와 숫자의 조합을 말합니다.
          <br />④ 비밀번호 : 회원이 부여받은 ID와 일치된 회원임을 확인하고 회원의 권익 보호를 위하여
          회원이 선정한 문자와 숫자의 조합을 말합니다.
          <br />⑤ 운영자 : 서비스에 홈페이지를 개설하여 운영하는 운영자를 말합니다.
          <br />⑥ 해지 : 회원이 이용계약을 해약하는 것을 말합니다.
          <br />
          <br />
          제3조 약관 외 준칙
          <br />
          <br />
          운영자는 필요한 경우 별도로 운영정책을 공지 안내할 수 있으며, 본 약관과 운영정책이 중첩될
          경우 운영정책이 우선 적용됩니다.
          <br />
          <br />
          제4조 이용계약 체결
          <br />① 이용계약은 회원으로 등록하여 사이트를 이용하려는 자의 본 약관 내용에 대한 동의와
          가입신청에 대하여 운영자의 이용승낙으로 성립합니다.
          <br />② 회원으로 등록하여 서비스를 이용하려는 자는 사이트 가입신청 시 본 약관을 읽고
          아래에 있는 "동의합니다"를 선택하는 것으로 본 약관에 대한 동의 의사 표시를 합니다.
          <br />
          <br />
          제5조 서비스 이용 신청
          <br />① 회원으로 등록하여 사이트를 이용하려는 이용자는 사이트에서 요청하는
          제반정보(이용자ID,비밀번호, 닉네임 등)를 제공해야 합니다.
          <br />② 타인의 정보를 도용하거나 허위의 정보를 등록하는 등 본인의 진정한 정보를 등록하지
          않은 회원은 사이트 이용과 관련하여 아무런 권리를 주장할 수 없으며, 관계 법령에 따라
          처벌받을 수 있습니다.
          <br />
          <br />
          제6조 개인정보처리방침
          <br />
          <br />
          사이트 및 운영자는 회원가입 시 제공한 개인정보 중 비밀번호를 가지고 있지 않으며 이와
          관련된 부분은 사이트의 개인정보처리방침을 따릅니다. 운영자는 관계 법령이 정하는 바에 따라
          회원등록정보를 포함한 회원의 개인정보를 보호하기 위하여 노력합니다. 회원의 개인정보보호에
          관하여 관계법령 및 사이트가 정하는 개인정보처리방침에 정한 바에 따릅니다. 단, 회원의 귀책
          사유로 인해 노출된 정보에 대해 운영자는 일체의 책임을 지지 않습니다. 운영자는 회원이
          미풍양속에 저해되거나 국가안보에 위배되는 게시물 등 위법한 게시물을 등록 · 배포할 경우
          관련 기관의 요청이 있을 시 회원의 자료를 열람 및 해당 자료를 관련 기관에 제출할 수
          있습니다.
          <br />
          <br />
          제7조 운영자의 의무
          <br />① 운영자는 이용회원으로부터 제기되는 의견이나 불만이 정당하다고 인정할 경우에는
          가급적 빨리 처리하여야 합니다. 다만, 개인적인 사정으로 신속한 처리가 곤란한 경우에는
          사후에 공지 또는 이용회원에게 쪽지, 전자우편 등을 보내는 등 최선을 다합니다.
          <br />② 운영자는 계속적이고 안정적인 사이트 제공을 위하여 설비에 장애가 생기거나 유실된
          때에는 이를 지체 없이 수리 또는 복구할 수 있도록 사이트에 요구할 수 있습니다. 다만,
          천재지변 또는 사이트나 운영자에 부득이한 사유가 있는 경우, 사이트 운영을 일시 정지할 수
          있습니다.
          <br />
          <br />
          제8조 회원의 의무
          <br />① 회원은 본 약관에서 규정하는 사항과 운영자가 정한 제반 규정, 공지사항 및 운영정책
          등 사이트가 공지하는 사항 및 관계 법령을 준수하여야 하며, 기타 사이트의 업무에 방해가 되는
          행위, 사이트의 명예를 손상하는 행위를 해서는 안 됩니다.
          <br />② 회원은 사이트의 명시적 동의가 없는 한 서비스의 이용 권한, 기타 이용계약상 지위를
          타인에게 양도, 증여할 수 없으며, 이를 담보로 제공할 수 없습니다.
          <br />③ 이용고객은 아이디 및 비밀번호 관리에 상당한 주의를 기울여야 하며, 운영자나
          사이트의 동의 없이 제3자에게 아이디를 제공하여 이용하게 할 수 없습니다.
          <br />④ 회원은 운영자와 사이트 및 제3자의 지적 재산권을 침해해서는 안 됩니다.
          <br />
          <br />
          제9조 서비스 이용 시간
          <br />① 서비스 이용 시간은 업무상 또는 기술상 특별한 지장이 없는 한 연중무휴 1일 24시간을
          원칙으로 합니다. 단, 사이트는 시스템 정기점검, 증설 및 교체를 위해 사이트가 정한 날이나
          시간에 서비스를 일시중단 할 수 있으며 예정된 작업으로 인한 서비스 일시 중단은 사이트의
          홈페이지에 사전에 공지하오니 수시로 참고하시길 바랍니다.
          <br />② 단, 사이트는 다음 경우에 대하여 사전 공지나 예고 없이 서비스를 일시적 혹은
          영구적으로 중단할 수 있습니다.
          <br />- 긴급한 시스템 점검, 증설, 교체, 고장 혹은 오동작을 일으키는 경우
          <br />- 국가비상사태, 정전, 천재지변 등의 불가항력적인 사유가 있는 경우
          <br />- 전기통신사업법에 규정된 기간통신사업자가 전기통신 서비스를 중지한 경우
          <br />- 서비스 이용의 폭주 등으로 정상적인 서비스 이용에 지장이 있는 경우
          <br />③ 전항에 의한 서비스 중단의 경우 사이트는 사전에 공지사항 등을 통하여 회원에게
          통지합니다. 단, 사이트가 통제할 수 없는 사유로 발생한 서비스의 중단에 대하여 사전공지가
          불가능한 경우에는 사후공지로 대신합니다.
          <br />
          <br />
          제10조 서비스 이용 해지
          <br />① 회원이 사이트와의 이용계약을 해지하고자 하는 경우에는 회원 본인이 온라인을 통하여
          등록해지 신청을 하여야 합니다. 한편, 사이트 이용 해지와 별개로 사이트에 대한 이용계약
          해지는 별도로 하셔야 합니다.
          <br />② 해지 신청과 동시에 사이트가 제공하는 사이트 관련 프로그램이 회원 관리 화면에서
          자동적으로 삭제됨으로 운영자는 더 이상 해지신청자의 정보를 볼 수 없습니다.
          <br />
          <br />
          제11조 서비스 이용 제한
          <br />
          <br />
          회원은 다음 각호에 해당하는 행위를 하여서는 아니 되며 해당 행위를 한 경우에 사이트는
          회원의 서비스 이용 제한 및 적법한 조치를 할 수 있으며 이용계약을 해지하거나 기간을 정하여
          서비스를 중지할 수 있습니다.
          <br />① 회원 가입시 혹은 가입 후 정보 변경 시 허위 내용을 등록하는 행위
          <br />② 타인의 사이트 이용을 방해하거나 정보를 도용하는 행위
          <br />③ 사이트의 운영진, 직원 또는 관계자를 사칭하는 행위
          <br />④ 사이트, 기타 제3자의 인격권 또는 지적재산권을 침해하거나 업무를 방해하는 행위
          <br />⑤ 다른 회원의 ID를 부정하게 사용하는 행위
          <br />⑥ 다른 회원에 대한 개인정보를 그 동의 없이 수집, 저장, 공개하는 행위
          <br />⑦ 범죄와 결부된다고 객관적으로 판단되는 행위
          <br />⑧ 기타 관련 법령에 위배되는 행위
          <br />
          <br />
          제12조 게시물의 관리
          <br />① 사이트의 게시물과 자료의 관리 및 운영의 책임은 운영자에게 있습니다. 운영자는 항상
          불량 게시물 및 자료에 대하여 모니터링을 하여야 하며, 불량 게시물 및 자료를 발견하거나
          신고를 받으면 해당 게시물 및 자료를 삭제하고 이를 등록한 회원에게 주의를 주어야 합니다.
          한편, 이용회원이 올린 게시물에 대해서는 게시자 본인에게 책임이 있으니 회원 스스로 본
          이용약관에서 위배되는 게시물은 게재해서는 안 됩니다.
          <br />② 정보통신윤리위원회 등 공공기관의 시정요구가 있는 경우 운영자는 회원의 사전동의
          없이 게시물을 삭제하거나 이동 할 수 있습니다.
          <br />③ 불량게시물의 판단기준은 다음과 같습니다.
          <br />- 다른 회원 또는 제3자에게 심한 모욕을 주거나 명예를 손상하는 내용인 경우
          <br />- 공공질서 및 미풍양속에 위반되는 내용을 유포하거나 링크 시키는 경우
          <br />- 불법 복제 또는 해킹을 조장하는 내용인 경우
          <br />- 영리를 목적으로 하는 광고일 경우
          <br />- 범죄와 결부된다고 객관적으로 인정되는 내용일 경우
          <br />- 다른 이용자 또는 제3자와 저작권 등 기타 권리를 침해하는 경우
          <br />- 기타 관계 법령에 위배된다고 판단되는 경우
          <br />④ 사이트 및 운영자는 게시물 등에 대하여 제3자로부터 명예훼손, 지적재산권 등의 권리
          침해를 이유로 게시중단 요청을 받은 경우 이를 임시로 게시 중단(전송중단)할 수 있으며,
          게시중단 요청자와 게시물 등록자 간에 소송, 합의 기타 이에 준하는 관련 기관의 결정 등이
          이루어져 사이트에 접수된 경우 이에 따릅니다.
          <br />
          <br />
          제13조 게시물의 보관
          <br />
          <br />
          사이트 운영자가 불가피한 사정으로 본 사이트를 중단하게 될 경우, 회원에게 사전 공지를 하고
          게시물의 이전이 쉽도록 모든 조치를 하기 위해 노력합니다.
          <br />
          <br />
          제14조 게시물에 대한 저작권
          <br />① 회원이 사이트 내에 게시한 게시물의 저작권은 게시한 회원에게 귀속됩니다. 또한
          사이트는 게시자의 동의 없이 게시물을 상업적으로 이용할 수 없습니다. 다만 비영리 목적인
          경우는 그러하지 아니하며, 또한 서비스 내의 게재권을 갖습니다.
          <br />② 회원은 서비스를 이용하여 취득한 정보를 임의 가공, 판매하는 행위 등 서비스에 게재된
          자료를 상업적으로 사용할 수 없습니다.
          <br />③ 운영자는 회원이 게시하거나 등록하는 사이트 내의 내용물, 게시 내용에 대해 제12조
          각호에 해당한다고 판단되는 경우 사전통지 없이 삭제하거나 이동 또는 등록 거부할 수
          있습니다.
          <br />
          <br />
          제15조 손해배상
          <br />① 본 사이트의 발생한 모든 민, 형법상 책임은 회원 본인에게 1차적으로 있습니다.
          <br />② 본 사이트로부터 회원이 받은 손해가 천재지변 등 불가항력적이거나 회원의 고의 또는
          과실로 인하여 발생한 때에는 손해배상을 하지 않습니다.
          <br />
          <br />
          제16조 면책
          <br />① 운영자는 회원이 사이트의 서비스 제공으로부터 기대되는 이익을 얻지 못하였거나
          서비스 자료에 대한 취사선택 또는 이용으로 발생하는 손해 등에 대해서는 책임이 면제됩니다.
          <br />② 운영자는 본 사이트의 서비스 기반 및 퀀 통신업자가 제공하는 전기통신 서비스의
          장애로 인한 경우에는 책임이 면제되며 본 사이트의 서비스 기반과 관련되어 발생한 손해에
          대해서는 사이트의 이용약관에 준합니다
          <br />③ 운영자는 회원이 저장, 게시 또는 전송한 자료와 관련하여 일체의 책임을 지지
          않습니다.
          <br />④ 운영자는 회원의 귀책 사유로 인하여 서비스 이용의 장애가 발생한 경우에는 책임지지
          아니합니다.
          <br />⑤ 운영자는 회원 상호 간 또는 회원과 제3자 상호 간, 기타 회원의 본 서비스 내외를
          불문한 일체의 활동(데이터 전송, 기타 커뮤니티 활동 포함)에 대하여 책임을 지지 않습니다.
          <br />⑥ 운영자는 회원이 게시 또는 전송한 자료 및 본 사이트로 회원이 제공받을 수 있는 모든
          자료들의 진위, 신뢰도, 정확성 등 그 내용에 대해서는 책임지지 아니합니다.
          <br />⑦ 운영자는 회원 상호 간 또는 회원과 제3자 상호 간에 서비스를 매개로 하여 물품거래
          등을 한 경우에 그로부터 발생하는 일체의 손해에 대하여 책임지지 아니합니다.
          <br />⑧ 운영자는 운영자의 귀책 사유 없이 회원간 또는 회원과 제3자간에 발생한 일체의 분쟁에
          대하여 책임지지 아니합니다.
          <br />⑨ 운영자는 서버 등 설비의 관리, 점검, 보수, 교체 과정 또는 소프트웨어의 운용
          과정에서 고의 또는 고의에 준하는 중대한 과실 없이 발생할 수 있는 시스템의 장애, 제3자의
          공격으로 인한 시스템의 장애, 국내외의 저명한 연구기관이나 보안 관련 업체에 의해 대응
          방법이 개발되지 아니한 컴퓨터 바이러스 등의 유포나 기타 운영자가 통제할 수 없는 불가항력적
          사유로 인한 회원의 손해에 대하여 책임지지 않습니다.
          <br />
          <br />
          부칙 이 약관은 사이트 개설일부터 시행합니다.
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
          Useless(이하 '회사'라 한다)는 개인정보 보호법 제30조에 따라 정보 주체의 개인정보를
          보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이
          개인정보 처리지침을 수립, 공개합니다.
          <br />
          <br />
          <strong>제1조 (개인정보의 처리목적)</strong>
          <br />
          회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적
          이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보보호법 제18조에
          따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
          <br />
          <br />
          1. 홈페이지 회원 가입 및 관리
          <br />
          회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별․인증, 회원자격 유지․관리, 제한적
          본인확인제 시행에 따른 본인확인, 서비스 부정 이용 방지, 만 14세 미만 아동의 개인정보처리
          시 법정대리인의 동의 여부 확인, 각종 고지․통지, 고충 처리 등을 목적으로 개인정보를
          처리합니다.
          <br />
          <br />
          2. 재화 또는 서비스 제공
          <br />
          물품 배송, 서비스 제공, 계약서 및 청구서 발송, 콘텐츠 제공, 맞춤서비스 제공, 본인인증,
          연령인증, 요금 결제 및 정산, 채권추심 등을 목적으로 개인정보를 처리합니다.
          <br />
          <br />
          3. 고충 처리
          <br />
          민원인의 신원 확인, 민원사항 확인, 사실조사를 위한 연락․통지, 처리 결과 통보 등의 목적으로
          개인정보를 처리합니다.
          <br />
          <br />
          <strong>제2조 (개인정보의 처리 및 보유기간)</strong>
          <br />① 회사는 법령에 따른 개인정보 보유, 이용 기간 또는 정보주체로부터 개인정보를 수집
          시에 동의 받은 개인정보 보유, 이용 기간 내에서 개인정보를 처리, 보유합니다.
          <br />② 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다.
          <br />
          <br />
          1. 홈페이지 회원 가입 및 관리 : 사업자/단체 홈페이지 탈퇴 시까지
          <br />
          다만, 다음의 사유에 해당하는 경우에는 해당 사유 종료 시까지
          <br />1 관계 법령 위반에 따른 수사, 조사 등이 진행 중인 경우에는 해당 수사, 조사 종료
          시까지
          <br />2 홈페이지 이용에 따른 채권 및 채무관계 잔존 시에는 해당 채권, 채무 관계 정산 시까지
          <br />
          <br />
          <strong>제4조(개인정보처리의 위탁)</strong>
          <br />① 회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고
          있습니다.
          <br />- 위탁업무 내용
          <br />- 위탁받는 자 (수탁자) : Google Cloud (Firebase)
          <br />- 위탁하는 업무의 내용 : 서버 운영 및 데이터 저장, 사용자 인증 등
          <br />- 보유 및 이용기간 : 회원 탈퇴 시 또는 위탁계약 종료 시까지
          <br />② 회사는 위탁계약 체결 시 개인정보 보호법 제25조에 따라 위탁업무 수행목적 외
          개인정보 처리금지, 기술적․관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리․감독, 손해배상
          등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를
          감독하고 있습니다.
          <br />③ 위탁업무의 내용이나 수탁자가 변경될 경우에는 지체없이 본 개인정보 처리방침을
          통하여 공개하도록 하겠습니다.
          <br />
          <br />
          <strong>제5조(정보주체 및 법정대리인의 권리와 그 행사 방법)</strong>
          <br />
          <br />① 정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수
          있습니다.
          <br />
          1. 개인정보 열람 요구
          <br />
          2. 오류 등이 있을 경우 정정 요구
          <br />
          3. 삭제요구
          <br />
          4. 처리정지 요구
          <br />② 제1항에 따른 권리 행사는 회사에 대해 서면, 전화, 전자우편, 모사전송(FAX) 등을
          통하여 하실 수 있으며 회사는 이에 대해 지체없이 조치하겠습니다.
          <br />③ 정보주체가 개인정보의 오류 등에 대한 정정 또는 삭제를 요구한 경우에는 회사는 정정
          또는 삭제를 완료할 때까지 당해 개인정보를 이용하거나 제공하지 않습니다.
          <br />④ 제1항에 따른 권리 행사는 정보주체의 법정대리인이나 위임을 받은 자 등 대리인을
          통하여 하실 수 있습니다. 이 경우 개인정보 보호법 시행규칙 별지 제11호 서식에 따른 위임장을
          제출하셔야 합니다.
          <br />⑤ 정보주체는 개인정보 보호법 등 관계 법령을 위반하여 회사가 처리하고 있는 정보주체
          본인이나 타인의 개인정보 및 사생활을 침해하여서는 아니 됩니다.
          <br />
          <br />
          <strong>제6조(처리하는 개인정보 항목)</strong>
          <br />
          회사는 다음의 개인정보 항목을 처리하고 있습니다.
          <br />
          <br />
          1. 홈페이지 회원 가입 및 관리
          <br />
          필수항목 : 이메일주소, Google UID, 휴대폰번호
          <br />
          <br />
          <strong>제7조(개인정보의 파기)</strong>
          <br />① 회사는 개인정보 보유 기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을
          때에는 지체없이 해당 개인정보를 파기합니다.
          <br />② 정보주체로부터 동의받은 개인정보 보유 기간이 경과하거나 처리목적이 달성되었음에도
          불구하고 다른 법령에 따라 개인정보를 계속 보존하여야 하는 경우에는, 해당 개인정보를 별도의
          데이터베이스(DB)로 옮기거나 보관장소를 달리하여 보존합니다.
          <br />③ 개인정보 파기의 절차 및 방법은 다음과 같습니다.
          <br />
          1. 파기 절차
          <br />
          회사는 파기 사유가 발생한 개인정보를 선정하고, 회사의 개인정보 보호책임자의 승인을 받아
          개인정보를 파기합니다.
          <br />
          2. 파기 방법
          <br />
          회사는 전자적 파일 형태로 기록․저장된 개인정보는 기록을 재생할 수 없도록 파기하며, 종이
          문서에 기록․저장된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.
          <br />
          <br />
          <strong>제8조(개인정보의 안전성 확보조치)</strong>
          <br />
          회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 하고 있습니다.
          <br />
          1. 관리적 조치 : 내부관리계획 수립 및 시행, 정기적 직원 교육 등
          <br />
          2. 기술적 조치 : 개인정보처리시스템 등의 접근 권한 관리, 접근통제시스템 설치, 고유
          식별정보 등의 암호화, 보안프로그램 설치
          <br />
          3. 물리적 조치 : 전산실, 자료보관실 등의 접근통제
          <br />
          <br />
          <strong>제9조(개인정보 자동 수집 장치의 설치∙운영 및 거부에 관한 사항)</strong>
          <br />① 회사는 이용자에게 개별적인 맞춤 서비스를 제공하기 위해 이용정보를 저장하고 수시로
          불러오는 '쿠키(cookie)'를 사용합니다.
          <br />② 쿠키는 웹사이트를 운영하는데 이용되는 서버(http)가 이용자의 컴퓨터 브라우저에
          보내는 소량의 정보이며 이용자들의 PC 또는 모바일에 저장됩니다.
          <br />③ 정보주체는 웹 브라우저 옵션 설정을 통해 쿠키 허용, 차단 등의 설정을 할 수
          있습니다. 다만, 쿠키 저장을 거부할 경우 맞춤형 서비스 이용에 어려움이 발생할 수 있습니다.
          <br />
          <br />▶ 웹 브라우저에서 쿠키 허용/차단
          <br />- 크롬(Chrome) : 웹 브라우저 설정 &gt; 개인정보 보호 및 보안 &gt; 인터넷 사용기록
          삭제
          <br />- 엣지(Edge) : 웹 브라우저 설정 &gt; 쿠키 및 사이트 권한 &gt; 쿠키 및 사이트 데이터
          관리 및 삭제
          <br />
          <br />▶ 모바일 브라우저에서 쿠키 허용/차단
          <br />- 크롬(Chrome) : 모바일 브라우저 설정 &gt; 개인정보 보호 및 보안 &gt; 인터넷
          사용기록 삭제
          <br />- 사파리(Safari) : 모바일 기기 설정 &gt; 사파리(Safari) &gt; 고급 &gt; 모든 쿠키
          차단
          <br />- 삼성 인터넷 : 모바일 브라우저 설정 &gt; 인터넷 사용 기록 &gt; 인터넷 사용 기록
          삭제
          <br />
          <br />④ 회사는 서비스 이용과정에서 사용자가 방문한 각 서비스와 웹 사이트들에 대한 방문 및
          이용형태, 인기 검색어, 보안접속 여부 등을 파악하여 이용자에게 최적화된 정보 제공을 위해
          수집・이용하고 있습니다.
          <br />
          <br />
          <strong>제10조(개인정보 보호책임자)</strong>
          <br />① 회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한
          정보주체의 불만 처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고
          있습니다.
          <br />
          <br />▶ 개인정보 보호책임자
          <br />
          성명 : 서진용
          <br />
          직책 : 매니저
          <br />
          연락처 : 010-4900-6586
          <br />※ 개인정보 보호 담당부서로 연결됩니다.
          <br />
          <br />▶ 개인정보 보호 담당부서
          <br />
          부서명 : 운영팀
          <br />
          연락처 : 010-4900-6586
          <br />
          <br />② 정보주체께서는 회사의 서비스(또는 사업)을 이용하시면서 발생한 모든 개인정보 보호
          관련 문의, 불만 처리, 피해구제 등에 관한 사항을 개인정보 보호책임자 및 담당부서로 문의하실
          수 있습니다. 회사는 정보주체의 문의에 대해 지체없이 답변 및 처리해드릴 것입니다.
          <br />
          <br />
          <strong>제11조(개인정보 열람청구)</strong>
          <br />
          정보주체는 개인정보 보호법 제35조에 따른 개인정보의 열람 청구를 아래의 부서에 할 수
          있습니다. 회사는 정보주체의 개인정보 열람 청구가 신속하게 처리되도록 노력하겠습니다.
          <br />
          <br />▶ 개인정보 열람청구 접수․처리 부서
          <br />
          부서명 : 운영팀
          <br />
          연락처 : 010-4900-6586
          <br />
          <br />
          <strong>제12조(권익침해 구제 방법)</strong>
          <br />
          정보주체는 아래의 기관에 대해 개인정보 침해에 대한 피해구제, 상담 등을 문의하실 수
          있습니다.
          <br />
          1. 개인정보 분쟁조정위원회 : (국번없이) 1833-6972 (www.kopico.go.kr)
          <br />
          2. 개인정보침해신고센터 : (국번없이) 118 (privacy.kisa.or.kr)
          <br />
          3. 대검찰청 : (국번없이) 1301 (www.spo.go.kr)
          <br />
          4. 경찰청 : (국번없이) 182 (ecrm.police.go.kr/minwon/main)
          <br />
          <br />
          <strong>제13조(개인정보 처리방침 시행 및 변경)</strong>
          <br />이 개인정보 처리방침은 2025. 4. 1. 부터 적용됩니다.
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {renderCheckbox(
          personalInfoAgreed,
          setPersonalInfoAgreed,
          '개인정보 수집 및 이용 동의',
          true
        )}
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
          <strong>1. 개인정보 수집목적 및 이용목적</strong>
          <br />
          (1) 홈페이지 회원 가입 및 관리 회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인
          식별․인증, 회원자격 유지․관리, 제한적 본인확인제 시행에 따른 본인확인, 서비스 부정 이용
          방지, 만 14세 미만 아동의 개인정보 처리시 법정대리인의 동의 여부 확인, 각종 고지․통지,
          고충 처리 등의 목적
          <br />
          (2) 재화 또는 서비스 제공 물품 배송, 서비스 제공, 계약서․청구서 발송, 콘텐츠 제공, 맞춤
          서비스 제공, 본인인증, 연령인증, 요금 결제 및 정산, 채권추심 등의 목적
          <br />
          (3) 고충 처리 민원인의 신원 확인, 민원사항 확인, 사실조사를 위한 연락․통지, 처리 결과 통보
          등
          <br />
          <strong>2. 수집하는 개인정보 항목</strong>
          <br />
          이메일, Google UID, 휴대폰번호
          <br />
          <strong>3. 개인정보 보유 및 이용기간</strong>
          <strong>회원탈퇴 시까지</strong> (단, 관계 법령에 보존 근거가 있는 경우 해당 기간 시까지
          보유, 개인정보처리방침에서 확인 가능)
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {renderCheckbox(over14Agreed, setOver14Agreed, '만 14세 이상입니다.', true)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {renderCheckbox(smsAgreed, setSmsAgreed, 'SMS 수신 동의')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {renderCheckbox(marketingAgreed, setMarketingAgreed, '마케팅 활용 동의 및 광고 수신 동의')}
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
          서비스와 관련된 신상품 소식, 이벤트 안내, 고객 혜택 등 다양한 정보를 제공합니다.
        </div>
      </div>

      {/* 필수 전체 동의 체크박스 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: '#F3F4F6',
          border: '1.5px solid #E5E7EB',
          borderRadius: '8px',
          padding: '18px 16px',
          margin: '24px 0 0 0',
        }}
      >
        {renderCheckbox(allRequiredChecked, handleCheckAllRequired, '필수 항목 전체 동의', true)}
      </div>
      {/* 전체 동의 체크박스 (맨 아래) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: '#F3F4F6',
          border: '1.5px solid #E5E7EB',
          borderRadius: '8px',
          padding: '20px 16px',
        }}
      >
        {renderCheckbox(allChecked, handleCheckAll, '전체 동의 (필수 및 선택 모두)', false)}
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

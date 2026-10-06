import { FC } from 'react';
import { Link } from 'react-router-dom';

// 푸터 운영 정보(AppIntroSpec §3.5). 전화번호·이용약관 링크는 두지 않는다(사용자 결정).
const BUSINESS_INFO = [
  { label: '상호', value: '마그마' },
  { label: '대표자', value: '장하림' },
  { label: '사업자등록번호', value: '167-58-00828' },
  { label: '통신판매업 신고번호', value: '제2026-성남분당B-0915호' },
  { label: '주소', value: '경기도 성남시 분당구 백현로 206, 410동 704호 (정자동, 한솔마을)' },
];

const CONTACT_EMAIL = 'doublejbjy@gmail.com';

const AppIntroFooterView: FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className='app-intro-footer'>
      <div className='app-intro-inner'>
        <dl className='app-intro-footer-info'>
          {BUSINESS_INFO.map(({ label, value }) => (
            <div key={label} className='app-intro-footer-item'>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
          <div className='app-intro-footer-item'>
            <dt>문의</dt>
            <dd>
              <a className='app-intro-footer-link' href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
            </dd>
          </div>
        </dl>
        <div className='app-intro-footer-bottom'>
          <Link className='app-intro-footer-policy' to='/privacy'>
            개인정보 처리방침
          </Link>
          <p className='app-intro-footer-copyright'>© {currentYear} useless</p>
        </div>
      </div>
    </footer>
  );
};

export default AppIntroFooterView;

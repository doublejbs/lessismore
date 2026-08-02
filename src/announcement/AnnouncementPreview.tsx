import { FC } from 'react';

// 앱 공지 바텀 시트 미리보기 props. 폼 입력값을 그대로 받아 렌더한다.
interface Props {
  message: string;
  link?: string;
}

const PREVIEW_FONT_FAMILY = "'Pretendard', -apple-system, 'Apple SD Gothic Neo', sans-serif";

// 앱의 공지 바텀 시트를 폰 프레임 안에 축소 재현하는 순수 프레젠테이션 컴포넌트.
const AnnouncementPreview: FC<Props> = ({ message, link }) => {
  return (
    <div style={{ fontFamily: PREVIEW_FONT_FAMILY }}>
      <div style={{ fontSize: 12, color: '#767676', marginBottom: 8 }}>앱 미리보기</div>
      <div
        style={{
          width: 320,
          height: 640,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #E5E5E5',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* 앱 화면 위에 깔리는 딤 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          {/* 하단 앵커 시트 */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: '12px 20px 24px',
            }}
          >
            {/* 그랩 핸들 */}
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 4,
                backgroundColor: '#EBEBEB',
                margin: '0 auto 12px',
              }}
            />
            {message ? (
              <div
                style={{
                  fontSize: 15,
                  lineHeight: '22px',
                  color: '#000000',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {message}
              </div>
            ) : (
              <div style={{ fontSize: 15, lineHeight: '22px', color: '#B0B8C1' }}>
                본문을 입력하세요
              </div>
            )}
            {link && (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#000000',
                  textDecoration: 'underline',
                }}
              >
                자세히 보기
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <div
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 8,
                  backgroundColor: '#EBEBEB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  color: '#000000',
                }}
              >
                닫기
              </div>
              <div
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 8,
                  backgroundColor: '#EBEBEB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  color: '#000000',
                }}
              >
                하루동안 보지않기
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementPreview;

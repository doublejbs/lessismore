import { FC, useState } from 'react';

// 미리보기용 소개 항목 형태. 폼의 Form.List 값이 입력 중에는 부분값일 수 있어 전부 옵셔널로 받는다.
interface PreviewItem {
  imageUrl?: string;
  title?: string;
  description?: string;
  link?: string;
}

// 앱 신기능 팝업 미리보기 props. 폼 입력값을 그대로 받아 렌더한다.
interface Props {
  title: string;
  subtitle?: string;
  items: PreviewItem[];
  buttonLabel?: string;
  showSkip: boolean;
}

const PREVIEW_FONT_FAMILY = "'Pretendard', -apple-system, 'Apple SD Gothic Neo', sans-serif";

// 항목 썸네일. 이미지 로드 실패 시 img를 숨기고 회색 배경 박스로 폴백한다.
const ItemThumb: FC<{ imageUrl?: string }> = ({ imageUrl }) => {
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    setHasError(true);
  };

  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 6,
        backgroundColor: '#F1F1F1',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {imageUrl && !hasError && (
        <img
          src={imageUrl}
          alt=''
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={handleError}
        />
      )}
    </div>
  );
};

// 앱의 신기능 팝업(중앙 카드)을 폰 프레임 안에 축소 재현하는 순수 프레젠테이션 컴포넌트.
const FeaturePopupPreview: FC<Props> = ({ title, subtitle, items, buttonLabel, showSkip }) => {
  // 제목이 입력된 항목만 표시한다(입력 중인 빈 행 제외).
  const visibleItems = items.filter((item) => !!item?.title);

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
            alignItems: 'center',
            padding: '0 16px',
          }}
        >
          {/* 중앙 카드 */}
          <div
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 20,
            }}
          >
            {title ? (
              <div
                style={{
                  fontSize: 18,
                  lineHeight: '25px',
                  fontWeight: 700,
                  color: '#000000',
                  textAlign: 'center',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {title}
              </div>
            ) : (
              <div
                style={{
                  fontSize: 18,
                  lineHeight: '25px',
                  fontWeight: 700,
                  color: '#B0B8C1',
                  textAlign: 'center',
                }}
              >
                제목을 입력하세요
              </div>
            )}
            {subtitle && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12.5,
                  lineHeight: '18px',
                  color: '#767676',
                  textAlign: 'center',
                }}
              >
                {subtitle}
              </div>
            )}
            {visibleItems.length > 0 && (
              <div
                style={{
                  marginTop: 16,
                  border: '1px solid #E5E5E5',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                {visibleItems.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderBottom:
                        index < visibleItems.length - 1 ? '1px solid #F0F0F0' : 'none',
                    }}
                  >
                    <ItemThumb imageUrl={item.imageUrl} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12.5,
                          lineHeight: '17px',
                          fontWeight: 600,
                          color: '#000000',
                        }}
                      >
                        {item.title}
                      </div>
                      {item.description && (
                        <div style={{ fontSize: 11, lineHeight: '15px', color: '#767676' }}>
                          {item.description}
                        </div>
                      )}
                    </div>
                    {item.link && (
                      <div style={{ fontSize: 16, color: '#B0B8C1', flexShrink: 0 }}>›</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div
              style={{
                marginTop: 16,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: '#FFFFFF',
              }}
            >
              {buttonLabel || '확인'}
            </div>
            {showSkip && (
              <div
                style={{
                  marginTop: 8,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  color: '#555555',
                }}
              >
                건너뛰기
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturePopupPreview;

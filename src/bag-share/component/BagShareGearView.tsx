import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import Gear from '../../model/Gear';

interface Props {
  gear: Gear;
}

const BagShareGearView: FC<Props> = ({ gear }) => {
  const imageUrl = gear.getImageUrl();
  const name = gear.getName();
  const company = gear.getCompany();
  /**
   * 로드에 실패한 URL. 실패 플래그가 아니라 **URL 자체를 기억**해, 다른 장비가 들어오면
   * 그 장비는 다시 시도하게 한다. 실패는 사진 없음과 같게 처리한다 — 깨진 아이콘을 남기지 않는다.
   */
  const [failedUrl, setFailedUrl] = useState<string | undefined>(undefined);
  /**
   * 여기 도달하는 `imageUrl`은 **배낭 주인이 직접 올린 사진만**이다 —
   * 크롤 이미지는 `BagStore.getSharedBag`이 이미 비워서 넘긴다. 그래서 뷰는 값의 출처를
   * 따지지 않고 "있으면 그린다"만 지킨다(앱의 `GearThumbnailView`와 같은 규칙).
   */
  const hasImage = !!imageUrl && failedUrl !== imageUrl;

  const handleImageError = () => {
    setFailedUrl(imageUrl);
  };
  const weight = gear.getWeight();

  return (
    <li
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        gap: '6px',
        padding: '12px',
        backgroundColor: 'white',
        listStyle: 'none',
      }}
    >
      {/* 사진이 없으면 **빈 박스도 안내 문구도 남기지 않는다** — 자리를 비워 텍스트 우선
          행 레이아웃을 그대로 쓴다. 사진이 있는 행이 적어서, 빈 박스를 두면 목록 전체가
          `이미지 없음` 회색 박스로 도배된다(앱의 `GearThumbnailView`와 같은 규칙). */}
      {hasImage ? (
        <div
          style={{
            width: '60px',
            height: '60px',
            flexShrink: 0,
            backgroundColor: '#F9FAFB',
            borderRadius: '6px',
            overflow: 'hidden',
          }}
        >
          <img
            src={imageUrl}
            alt={name}
            onError={handleImageError}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          gap: '4px',
        }}
      >
        <div
          style={{
            fontSize: '14px',
            color: '#6B7280',
            lineHeight: '1.2',
          }}
        >
          {company}
        </div>
        <div
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#1F2937',
            lineHeight: '1.2',
          }}
        >
          {name}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          minWidth: '50px',
          justifyContent: 'flex-end',
        }}
      >
        {weight}g
      </div>
    </li>
  );
};

export default observer(BagShareGearView);

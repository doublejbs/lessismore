import { FC, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import GearShare from '../model/GearShare';

interface Props {
  gearShare: GearShare;
}

const APP_STORE_URL = 'https://apps.apple.com/kr/app/id6751174681';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=kr.co.useless.app';

const isAndroid = /Android/i.test(navigator.userAgent);

// 장비 공유 랜딩(GD-7). 장비 정보를 보여주고 '앱에서 보기'로 딥링크한다.
// 앱 미설치 시 스토어로 폴백(박지 공유 CS-7과 동일 구조).
const GearShareView: FC<Props> = ({ gearShare }) => {
  const openApp = useCallback(() => {
    const scheme = `lessismoreapp://gear-detail/${gearShare.getId()}`;
    const storeUrl = isAndroid ? PLAY_STORE_URL : APP_STORE_URL;

    let fallback: ReturnType<typeof setTimeout> | null = null;

    const cancelFallback = () => {
      if (fallback) {
        clearTimeout(fallback);
        fallback = null;
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelFallback();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    fallback = setTimeout(() => {
      cancelFallback();
      window.location.href = storeUrl;
    }, 1500);

    window.location.href = scheme;
  }, [gearShare]);

  if (!gearShare.isInitialized()) {
    return (
      <div style={styles.center}>
        <p style={styles.muted}>불러오는 중…</p>
      </div>
    );
  }

  if (gearShare.isNotFound()) {
    return (
      <div style={styles.center}>
        <p style={styles.muted}>장비 정보를 찾을 수 없어요.</p>
        <a href='https://useless.my' style={styles.linkMuted}>
          useless 홈으로
        </a>
      </div>
    );
  }

  const imageUrl = gearShare.getImageUrl();
  const metaLine = gearShare.getMetaLine();
  const weightLabel = gearShare.getWeightLabel();

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {imageUrl ? (
          <img src={imageUrl} alt={gearShare.getName()} style={styles.image} />
        ) : (
          <div style={styles.imagePlaceholder} />
        )}

        <div style={styles.body}>
          <div style={styles.infoRow}>
            <div style={styles.infoText}>
              <p style={styles.company}>{gearShare.getCompany()}</p>
              <h1 style={styles.title}>{gearShare.getName()}</h1>
              {metaLine && <p style={styles.meta}>{metaLine}</p>}
            </div>
            {weightLabel && (
              <div style={styles.weightBox}>
                <span style={styles.weightCaption}>무게</span>
                <span style={styles.weight}>{weightLabel}</span>
              </div>
            )}
          </div>

          <button type='button' style={styles.cta} onClick={openApp}>
            앱에서 보기
          </button>
          <p style={styles.ctaHint}>
            useless 앱이 없으면 앱스토어로 이동해요
          </p>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#F5F5F5',
    display: 'flex',
    justifyContent: 'center',
    padding: '20px 16px 40px',
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  image: {
    width: '100%',
    aspectRatio: '1 / 1',
    objectFit: 'contain',
    display: 'block',
    backgroundColor: '#F1F1F1',
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: '1 / 1',
    backgroundColor: '#F1F1F1',
  },
  body: {
    padding: 20,
  },
  infoRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoText: {
    flex: 1,
    minWidth: 0,
  },
  company: {
    fontSize: 13,
    color: '#000000',
    margin: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#000000',
    margin: '2px 0 0',
  },
  meta: {
    fontSize: 13,
    color: '#767676',
    margin: '6px 0 0',
  },
  weightBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  weightCaption: {
    fontSize: 11,
    color: '#767676',
  },
  weight: {
    fontSize: 16,
    fontWeight: 700,
    color: '#000000',
    marginTop: 2,
  },
  cta: {
    width: '100%',
    marginTop: 24,
    padding: '16px 0',
    border: 'none',
    borderRadius: 12,
    backgroundColor: '#000000',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },
  ctaHint: {
    fontSize: 12,
    color: '#767676',
    textAlign: 'center',
    marginTop: 8,
  },
  center: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F5F5F5',
  },
  muted: {
    fontSize: 15,
    color: '#767676',
  },
  linkMuted: {
    fontSize: 14,
    color: '#555555',
  },
};

export default observer(GearShareView);

import { FC, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import CampShare from '../model/CampShare';

interface Props {
  campShare: CampShare;
}

const APP_STORE_URL = 'https://apps.apple.com/kr/app/id6751174681';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=kr.co.useless.app';

const isAndroid = /Android/i.test(navigator.userAgent);

// 박지 공유 랜딩(CS-7). 박지 정보를 보여주고 '앱에서 보기'로 딥링크한다.
// 앱 미설치 시 스토어로 폴백(Universal Link 미사용 — 웹 랜딩을 먼저 보여주는 의도).
const CampShareView: FC<Props> = ({ campShare }) => {
  const openApp = useCallback(() => {
    const scheme = `lessismoreapp://camp-site/${campShare.getId()}`;
    const storeUrl = isAndroid ? PLAY_STORE_URL : APP_STORE_URL;

    // 앱이 열리면 페이지가 백그라운드로 가므로, visibility가 바뀌면 스토어 폴백을 취소한다.
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
  }, [campShare]);

  if (!campShare.isInitialized()) {
    return (
      <div style={styles.center}>
        <p style={styles.muted}>불러오는 중…</p>
      </div>
    );
  }

  if (campShare.isNotFound()) {
    return (
      <div style={styles.center}>
        <p style={styles.muted}>박지 정보를 찾을 수 없어요.</p>
        <a href='https://useless.my' style={styles.linkMuted}>
          useless 홈으로
        </a>
      </div>
    );
  }

  const imageUrl = campShare.getImageUrl();
  const warnings = campShare.getWarnings();
  const description = campShare.getDescription();
  const tags = campShare.getTagLabels();

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {imageUrl ? (
          <img src={imageUrl} alt={campShare.getName()} style={styles.image} />
        ) : (
          <div style={styles.imagePlaceholder} />
        )}

        <div style={styles.body}>
          <div style={styles.titleRow}>
            <h1 style={styles.title}>{campShare.getName()}</h1>
            <span style={styles.badge}>{campShare.getTypeLabel()}</span>
          </div>
          <p style={styles.region}>{campShare.getRegion()}</p>

          {tags.length > 0 && (
            <div style={styles.tagRow}>
              {tags.map(tag => (
                <span key={tag} style={styles.tag}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {warnings && (
            <div style={styles.warning}>
              <span style={styles.warningIcon}>⚠️</span>
              <span>{warnings}</span>
            </div>
          )}

          {description && <p style={styles.description}>{description}</p>}

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
    aspectRatio: '16 / 9',
    objectFit: 'cover',
    display: 'block',
    backgroundColor: '#F1F1F1',
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: '16 / 9',
    backgroundColor: '#F1F1F1',
  },
  body: {
    padding: 20,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#000000',
    margin: 0,
  },
  badge: {
    fontSize: 12,
    fontWeight: 500,
    color: '#555555',
    backgroundColor: '#EBEBEB',
    borderRadius: 999,
    padding: '3px 8px',
  },
  region: {
    fontSize: 14,
    color: '#767676',
    margin: '6px 0 0',
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tag: {
    fontSize: 12,
    color: '#555555',
    backgroundColor: '#EBEBEB',
    borderRadius: 999,
    padding: '4px 10px',
  },
  warning: {
    display: 'flex',
    gap: 8,
    marginTop: 14,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFF4E5',
    color: '#B65A00',
    fontSize: 14,
    lineHeight: 1.5,
  },
  warningIcon: {
    flexShrink: 0,
  },
  description: {
    fontSize: 15,
    lineHeight: 1.6,
    color: '#000000',
    marginTop: 14,
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

export default observer(CampShareView);

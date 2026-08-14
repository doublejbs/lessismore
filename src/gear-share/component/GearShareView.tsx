import { CSSProperties, FC, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import GearShare from '../model/GearShare';

interface Props {
  gearShare: GearShare;
}

// 앱 설치 화면(src/app-install/AppInstallView.tsx)에서 사용하는 스토어 링크와 동일하다.
const APP_STORE_URL = 'https://apps.apple.com/kr/app/id6751174681';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=kr.co.useless.app';

// 장비 공유 랜딩(GD-7). 앱이 설치되어 있으면 장비 상세 딥링크를 열고, 아니면 스토어로 보낸다.
const GearShareView: FC<Props> = ({ gearShare }) => {
  const userAgent =
    typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isMobile = isIOS || isAndroid;
  const storeUrl = isAndroid ? PLAY_STORE_URL : APP_STORE_URL;
  const metaLine = gearShare.getMetaLine();
  const weightLabel = gearShare.getWeightLabel();
  const ctaHint = isMobile
    ? '앱이 없으면 스토어로 이동해요'
    : '모바일 기기에서는 앱으로, 데스크톱에서는 앱스토어로 이동해요';

  const openApp = useCallback(() => {
    // 데스크톱에서는 커스텀 스킴을 호출하지 않고 스토어로 안내한다.
    if (!isMobile) {
      window.location.href = storeUrl;
      return;
    }

    const scheme = `lessismoreapp://gear-detail/${gearShare.getId()}`;
    let fallback: ReturnType<typeof setTimeout> | null = null;

    const cancelFallback = () => {
      if (fallback !== null) {
        clearTimeout(fallback);
        fallback = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelFallback();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    fallback = setTimeout(() => {
      cancelFallback();
      window.location.href = storeUrl;
    }, 1500);

    window.location.href = scheme;
  }, [gearShare, isMobile, storeUrl]);

  if (!gearShare.isInitialized()) {
    return (
      <main style={styles.center}>
        <p style={styles.muted}>불러오는 중…</p>
      </main>
    );
  }

  if (gearShare.isNotFound()) {
    return (
      <main style={styles.center}>
        <p style={styles.muted}>장비 정보를 찾을 수 없어요.</p>
        <a href='https://useless.my' style={styles.linkMuted}>
          useless 홈으로
        </a>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.content} aria-labelledby='gear-share-name'>
        <div style={styles.identityRow}>
          <div style={styles.identityColumn}>
            {gearShare.getCompany() && (
              <p style={styles.company}>{gearShare.getCompany()}</p>
            )}
            <h1 id='gear-share-name' style={styles.title}>
              {gearShare.getName()}
            </h1>
            {metaLine && <p style={styles.meta}>{metaLine}</p>}
          </div>
          {weightLabel && <p style={styles.weight}>{weightLabel}</p>}
        </div>

        <button type='button' style={styles.cta} onClick={openApp}>
          앱으로 보기
        </button>
        <p style={styles.ctaHint}>{ctaHint}</p>
      </section>
    </main>
  );
};

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    boxSizing: 'border-box',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    justifyContent: 'center',
    padding: '0 24px calc(40px + env(safe-area-inset-bottom))',
  },
  content: {
    width: '100%',
    maxWidth: 520,
    boxSizing: 'border-box',
    paddingTop: 24,
  },
  identityRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 32,
  },
  identityColumn: {
    flex: 1,
    minWidth: 0,
  },
  company: {
    margin: 0,
    color: '#767676',
    fontSize: 14,
    lineHeight: '20px',
    fontWeight: 600,
  },
  title: {
    margin: '2px 0 0',
    color: '#1A1A1A',
    fontSize: 22,
    lineHeight: '28px',
    letterSpacing: '-0.4px',
    fontWeight: 600,
    overflowWrap: 'anywhere',
  },
  meta: {
    margin: '6px 0 0',
    color: '#767676',
    fontSize: 13,
    lineHeight: '18px',
    letterSpacing: '0.1px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  weight: {
    flexShrink: 0,
    margin: 0,
    color: '#1A1A1A',
    fontFamily:
      '"Arial Narrow", "Roboto Condensed", "Avenir Next Condensed", sans-serif',
    fontSize: 28,
    lineHeight: '32px',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
  },
  cta: {
    width: '100%',
    minHeight: 52,
    boxSizing: 'border-box',
    padding: '14px 24px',
    border: 'none',
    borderRadius: 999,
    backgroundColor: '#C8F244',
    color: '#1A1A1A',
    fontFamily: 'inherit',
    fontSize: 14,
    lineHeight: '20px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  ctaHint: {
    margin: '12px 0 0',
    color: '#767676',
    fontSize: 13,
    lineHeight: '18px',
    textAlign: 'center',
  },
  center: {
    minHeight: '100vh',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  muted: {
    margin: 0,
    color: '#767676',
    fontSize: 14,
    lineHeight: '20px',
  },
  linkMuted: {
    color: '#1A1A1A',
    fontSize: 14,
    lineHeight: '20px',
  },
};

export default observer(GearShareView);

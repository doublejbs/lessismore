import { CSSProperties, FC, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import GroupInvite from '../model/GroupInvite';
import { isMobileDevice, openAppScheme } from '../../utils/AppSchemeLink';

interface Props {
  groupInvite: GroupInvite;
}

// 그룹 초대 랜딩(GRP-3). 그룹 이름·기간·여행지·멤버 수를 보여주고 `앱에서 열기`로 앱 스킴을 연다.
// 앱은 Universal Links를 쓰지 않으므로 이 화면이 앱으로 들어가는 유일한 경로다.
const GroupInviteView: FC<Props> = ({ groupInvite }) => {
  const isMobile = isMobileDevice();
  const ctaHint = isMobile
    ? '앱이 없으면 스토어로 이동해요'
    : '모바일 기기에서는 앱으로, 데스크톱에서는 앱스토어로 이동해요';

  const handleOpenApp = useCallback(() => {
    openAppScheme(groupInvite.getAppSchemeUrl());
  }, [groupInvite]);

  if (groupInvite.isLoading()) {
    return (
      <main style={styles.center}>
        <p style={styles.muted}>불러오는 중…</p>
      </main>
    );
  }

  // groupId가 없는 링크 — 앱으로 넘길 대상이 없으므로 축소 형태가 아니라 이 화면이다.
  if (groupInvite.isInvalidLink()) {
    return (
      <main style={styles.center}>
        <p style={styles.muted}>잘못된 초대 링크예요</p>
        <a href='https://lessismore-7e070.web.app' style={styles.linkMuted}>
          useless 홈으로
        </a>
      </main>
    );
  }

  // 초대 요약을 못 읽은 축소 형태 — 앱으로 넘기는 것만 남긴다.
  // 미러가 아직 없는 경우(결과적 일관성)와 읽기 실패를 구분하지 않는다. 해산된 그룹도 여기로 오지만,
  // 방금 만든 그룹의 초대 링크에 `사라진 그룹`이라고 말하는 쪽이 훨씬 나쁘다(GRP-3·DM-29).
  if (groupInvite.isUnavailable()) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          <div style={styles.body}>
            <p style={styles.label}>그룹 초대</p>
            <h1 style={styles.title}>앱에서 초대를 확인해 주세요</h1>
            <p style={styles.description}>
              그룹 정보는 앱에서 볼 수 있어요. 아래 버튼으로 앱을 열면 그룹 이름과
              일정을 확인하고 참여할 수 있어요.
            </p>

            <button type='button' style={styles.cta} onClick={handleOpenApp}>
              앱에서 열기
            </button>
            <p style={styles.ctaHint}>{ctaHint}</p>
          </div>
        </div>
      </main>
    );
  }

  const destinationName = groupInvite.getDestinationName();
  const periodLabel = groupInvite.getPeriodLabel();
  const noticeMessage = groupInvite.getNoticeMessage();

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.body}>
          <p style={styles.label}>그룹 초대</p>
          <h1 style={styles.title}>{groupInvite.getName()}</h1>

          {periodLabel && <p style={styles.period}>{periodLabel}</p>}

          <div style={styles.metaRow}>
            {destinationName && (
              <span style={styles.meta}>{destinationName}</span>
            )}
            <span style={styles.meta}>{groupInvite.getMemberCountLabel()}</span>
          </div>

          {noticeMessage && (
            <div style={styles.notice}>
              <span style={styles.noticeIcon}>⚠️</span>
              <span>{noticeMessage}</span>
            </div>
          )}

          <button type='button' style={styles.cta} onClick={handleOpenApp}>
            앱에서 열기
          </button>
          <p style={styles.ctaHint}>{ctaHint}</p>
        </div>
      </div>
    </main>
  );
};

const styles: Record<string, CSSProperties> = {
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
    alignSelf: 'flex-start',
  },
  body: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: '#767676',
    margin: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#000000',
    margin: '6px 0 0',
    lineHeight: 1.35,
  },
  period: {
    fontSize: 15,
    color: '#555555',
    margin: '10px 0 0',
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  meta: {
    fontSize: 13,
    color: '#555555',
    backgroundColor: '#EBEBEB',
    borderRadius: 999,
    padding: '4px 10px',
  },
  notice: {
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
  noticeIcon: {
    flexShrink: 0,
  },
  description: {
    fontSize: 15,
    lineHeight: 1.6,
    color: '#555555',
    marginTop: 12,
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

export default observer(GroupInviteView);

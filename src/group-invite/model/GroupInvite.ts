import { makeAutoObservable } from 'mobx';
import { doc, getDoc } from 'firebase/firestore';
import app from '../../App';
import GroupInviteStatus from './GroupInviteStatus';

// 그룹 초대 랜딩(GRP-3)에서 표시할 초대 공개 요약. Firestore `groupInvites/{groupId}`(DM-29)를 읽는다.
// 그룹 문서 `groups/{groupId}`는 보안 규칙이 로그인을 요구하고 이 랜딩은 비인증이라, 서버가
// 초대 화면에 필요한 값만 복제해 둔 이 미러를 읽는다. `meetingNote`·`memberIds`·`ownerId`는
// 미러에 담기지 않으므로 화면에서 쓸 수 없다.
export interface GroupInviteSummary {
  name?: string;
  startDate?: string;
  endDate?: string;
  destinationName?: string;
  memberCount?: number;
  inviteEnabled?: boolean;
}

// 멤버 상한(GRP-3). 참여 거절은 앱이 판단하고, 웹은 안내만 한다.
// 앱 레포 `model/group/GroupLimits.ts`의 `GROUP_MAX_MEMBER_COUNT`와 손으로 맞춘 값이다.
// 웹에서 앱 상수를 import할 수 없어 복제해 두었으니, 한쪽만 바꾸면 조용히 어긋난다 —
// 앱 상한이 바뀌면 이 값도 반드시 함께 고칠 것.
const MAX_MEMBERS = 20;

class GroupInvite {
  public static from(id: string) {
    return new GroupInvite(id);
  }

  private summary: GroupInviteSummary | null = null;
  private status: GroupInviteStatus = GroupInviteStatus.Loading;

  private constructor(private readonly id: string) {
    makeAutoObservable(this);
  }

  public async initialize() {
    if (!this.id) {
      this.setStatus(GroupInviteStatus.InvalidLink);

      return;
    }

    try {
      const snapshot = await getDoc(
        doc(app.getFirebase().getStore(), 'groupInvites', this.id)
      );

      if (!snapshot.exists()) {
        // 미러는 결과적 일관성이다(DM-29) — 그룹을 만든 직후나 서버 트리거 배포 전에는 문서가 없다.
        // 해산된 그룹과 구분할 방법이 없는데, 방금 만든 그룹의 초대 링크가
        // `사라진 그룹`이라고 말하는 쪽이 훨씬 나쁘다. 축소 형태로 떨어뜨린다.
        this.setStatus(GroupInviteStatus.Unavailable);
      } else {
        this.setSummary(snapshot.data() as GroupInviteSummary);
        this.setStatus(GroupInviteStatus.Ready);
      }
    } catch (e) {
      // 권한 거부·네트워크 오류. 초대 링크가 통째로 죽는 것보다,
      // 그룹 정보 없이 앱으로 넘기는 축소 형태로 떨어뜨리는 편이 낫다.
      console.error('초대 요약 조회 실패:', e);
      this.setStatus(GroupInviteStatus.Unavailable);
    }
  }

  private setSummary(value: GroupInviteSummary) {
    this.summary = value;
  }

  private setStatus(value: GroupInviteStatus) {
    this.status = value;
  }

  public getId() {
    return this.id;
  }

  public isLoading() {
    return this.status === GroupInviteStatus.Loading;
  }

  // URL에 groupId가 없다. 앱으로 넘길 대상 자체가 없는 링크다.
  public isInvalidLink() {
    return this.status === GroupInviteStatus.InvalidLink;
  }

  // 미러 문서가 없거나 읽기가 실패한 상태. 앱 열기·설치 안내만 남긴다.
  public isUnavailable() {
    return this.status === GroupInviteStatus.Unavailable;
  }

  public isReady() {
    return this.status === GroupInviteStatus.Ready;
  }

  public getName() {
    return this.summary?.name ?? '';
  }

  public getDestinationName() {
    return this.summary?.destinationName ?? '';
  }

  // `YYYY-MM-DD` 문자열을 `YYYY.MM.DD ~ YYYY.MM.DD`로 바꾼다.
  // 시작일과 종료일이 같으면(하루짜리 여행) 한 날짜만 표시한다.
  public getPeriodLabel() {
    const start = this.toDateLabel(this.summary?.startDate);
    const end = this.toDateLabel(this.summary?.endDate);

    if (!start) {
      return end;
    }

    if (!end || start === end) {
      return start;
    }

    return `${start} ~ ${end}`;
  }

  private toDateLabel(value?: string) {
    return value ? value.replace(/-/g, '.') : '';
  }

  public getMemberCount() {
    return this.summary?.memberCount ?? 0;
  }

  public getMemberCountLabel() {
    return `멤버 ${this.getMemberCount()}명`;
  }

  public isFull() {
    return this.getMemberCount() >= MAX_MEMBERS;
  }

  // 방장이 초대 링크를 잠근 상태(GRP-3). 필드가 없으면 기본 true라 열린 것으로 본다.
  public isInviteClosed() {
    return this.summary?.inviteEnabled === false;
  }

  // 초대 마감과 정원 초과가 같이 성립하면, 방장이 명시적으로 잠근 쪽을 먼저 알린다.
  public getNoticeMessage() {
    if (this.isInviteClosed()) {
      return '초대가 마감됐어요';
    }

    if (this.isFull()) {
      return '정원이 찼어요';
    }

    return '';
  }

  public getAppSchemeUrl() {
    // 앱의 참여 화면(app/group/join.tsx)은 동적 세그먼트가 없어 쿼리로 받는다(GRP-3).
    return `lessismoreapp://group/join?groupId=${encodeURIComponent(this.id)}`;
  }
}

export default GroupInvite;

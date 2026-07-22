import dayjs, { Dayjs } from 'dayjs';

// 어드민 화면에서 쓰는 ISO 문자열 ↔ dayjs 변환·표시 유틸.

export const toIsoString = (value?: Dayjs): string | undefined => {
  if (!value) {
    return undefined;
  }

  return value.toISOString();
};

export const toDayjs = (value?: string): Dayjs | undefined => {
  if (!value) {
    return undefined;
  }

  return dayjs(value);
};

export const formatDateTime = (value?: string): string => {
  if (!value) {
    return '-';
  }

  return dayjs(value).format('YYYY-MM-DD HH:mm');
};

export const formatPeriod = (startAt?: string, endAt?: string): string => {
  if (!startAt && !endAt) {
    return '-';
  }

  return `${formatDateTime(startAt)} ~ ${formatDateTime(endAt)}`;
};

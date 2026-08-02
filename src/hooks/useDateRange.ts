import dayjs from 'dayjs';
import { useState, useCallback } from 'react';

interface UseDateRangeProps {
  initialStartDate?: dayjs.Dayjs | null;
  initialEndDate?: dayjs.Dayjs | null;
  minDate?: dayjs.Dayjs;
  maxDate?: dayjs.Dayjs;
}

interface UseDateRangeReturn {
  startDate: dayjs.Dayjs | null;
  endDate: dayjs.Dayjs | null;
  setStartDate: (date: dayjs.Dayjs | null) => void;
  setEndDate: (date: dayjs.Dayjs | null) => void;
  resetDates: () => void;
  durationInDays: number;
  isDateInRange: (date: dayjs.Dayjs) => boolean;
  hasSelectedDates: boolean;
}

export const useDateRange = ({
  initialStartDate = null,
  initialEndDate = null,
  minDate,
  maxDate,
}: UseDateRangeProps = {}): UseDateRangeReturn => {
  const [startDate, setStartDateState] = useState<dayjs.Dayjs | null>(initialStartDate);
  const [endDate, setEndDateState] = useState<dayjs.Dayjs | null>(initialEndDate);

  const setStartDate = useCallback(
    (date: dayjs.Dayjs | null) => {
      if (!date) {
        setStartDateState(null);
        return;
      }

      // 최소 날짜 체크
      if (minDate && date.isBefore(minDate)) {
        date = minDate;
      }

      // 최대 날짜 체크
      if (maxDate && date.isAfter(maxDate)) {
        date = maxDate;
      }

      // 시작일이 종료일보다 나중이면 종료일도 함께 업데이트
      if (endDate && date.isAfter(endDate)) {
        setEndDateState(date);
      }

      setStartDateState(date);
    },
    [endDate, minDate, maxDate]
  );

  const setEndDate = useCallback(
    (date: dayjs.Dayjs | null) => {
      if (!date) {
        setEndDateState(null);
        return;
      }

      // 최대 날짜 체크
      if (maxDate && date.isAfter(maxDate)) {
        date = maxDate;
      }

      // 종료일이 시작일보다 이전이면 시작일로 설정
      if (startDate && date.isBefore(startDate)) {
        date = startDate;
      }

      setEndDateState(date);
    },
    [startDate, maxDate]
  );

  const resetDates = useCallback(() => {
    setStartDateState(initialStartDate);
    setEndDateState(initialEndDate);
  }, [initialStartDate, initialEndDate]);

  const durationInDays = startDate && endDate ? endDate.diff(startDate, 'day') : 0;

  const isDateInRange = useCallback(
    (date: dayjs.Dayjs) => {
      if (!startDate || !endDate) return false;

      return (
        (date.isAfter(startDate) || date.isSame(startDate, 'day')) &&
        (date.isBefore(endDate) || date.isSame(endDate, 'day'))
      );
    },
    [startDate, endDate]
  );

  const hasSelectedDates = !!startDate || !!endDate;

  return {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    resetDates,
    durationInDays,
    isDateInRange,
    hasSelectedDates,
  };
};

export default useDateRange;

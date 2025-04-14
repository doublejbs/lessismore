import dayjs from 'dayjs';
import { FC, useState, useEffect } from 'react';

interface DateRangeCalendarProps {
  startDate: dayjs.Dayjs | null;
  endDate: dayjs.Dayjs | null;
  onStartDateChange: (date: dayjs.Dayjs) => void;
  onEndDateChange: (date: dayjs.Dayjs | null) => void;
}

const DateRangeCalendar: FC<DateRangeCalendarProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));
  const [calendarDays, setCalendarDays] = useState<dayjs.Dayjs[]>([]);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  useEffect(() => {
    const firstDayOfMonth = currentMonth.startOf('month');
    const lastDayOfMonth = currentMonth.endOf('month');

    // 이전 달의 마지막 일부 날짜들 (첫째 주를 채우기 위함)
    const daysFromPrevMonth = firstDayOfMonth.day();
    const prevMonthDays = Array.from({ length: daysFromPrevMonth }, (_, i) =>
      firstDayOfMonth.subtract(daysFromPrevMonth - i, 'day')
    );

    // 현재 달의 모든 날짜
    const daysInMonth = lastDayOfMonth.date();
    const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) =>
      firstDayOfMonth.add(i, 'day')
    );

    // 다음 달의 첫 일부 날짜들 (마지막 주를 채우기 위함)
    const daysFromNextMonth = 6 - lastDayOfMonth.day();
    const nextMonthDays = Array.from({ length: daysFromNextMonth }, (_, i) =>
      lastDayOfMonth.add(i + 1, 'day')
    );

    setCalendarDays([...prevMonthDays, ...currentMonthDays, ...nextMonthDays]);
  }, [currentMonth]);

  const handleDateClick = (day: dayjs.Dayjs) => {
    // 1. startDate와 endDate가 모두 있으면 - 새 startDate 선택하고 endDate는 해제
    if (startDate && endDate) {
      onStartDateChange(day);
      onEndDateChange(null);
    }
    // 2. startDate만 있고, 선택한 날짜가 startDate보다 이전이면 - 새 startDate 선택
    else if (startDate && !endDate && day.isBefore(startDate)) {
      onStartDateChange(day);
    }
    // 3. startDate만 있고, 선택한 날짜가 startDate보다 나중이면 - endDate 선택
    else if (startDate && !endDate && day.isAfter(startDate)) {
      onEndDateChange(day);
    } else if (startDate && day.isSame(startDate)) {
      onEndDateChange(day);
    }
    // 4. startDate가 없으면 (또는 기타 경우) - startDate 선택
    else {
      onStartDateChange(day);
    }
  };

  const isInRange = (day: dayjs.Dayjs) => {
    if (!startDate || !endDate) return false;
    return day.isAfter(startDate) && day.isBefore(endDate);
  };

  const isToday = (day: dayjs.Dayjs) => {
    return day.format('YYYY.MM.DD') === dayjs().format('YYYY.MM.DD');
  };

  const isSelectedStart = (day: dayjs.Dayjs) => {
    if (!startDate) return false;
    return day.format('YYYY.MM.DD') === startDate.format('YYYY.MM.DD');
  };

  const isSelectedEnd = (day: dayjs.Dayjs) => {
    if (!endDate) return false;
    return day.format('YYYY.MM.DD') === endDate.format('YYYY.MM.DD');
  };

  const isCurrentMonth = (day: dayjs.Dayjs) => {
    return day.month() === currentMonth.month();
  };

  const navigateToPreviousMonth = () => {
    setCurrentMonth(currentMonth.subtract(1, 'month'));
  };

  const navigateToNextMonth = () => {
    setCurrentMonth(currentMonth.add(1, 'month'));
  };

  return (
    <div style={{ width: '100%', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>시작일</div>
          <div
            style={{
              backgroundColor: 'rgb(238, 238, 238)',
              padding: '8px 12px',
              borderRadius: '8px',
            }}
          >
            {startDate ? startDate.format('YYYY.MM.DD') : '선택 안됨'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>종료일</div>
          <div
            style={{
              backgroundColor: 'rgb(238, 238, 238)',
              padding: '8px 12px',
              borderRadius: '8px',
            }}
          >
            {endDate ? endDate.format('YYYY.MM.DD') : '선택 안됨'}
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '10px 0',
        }}
      >
        <button
          onClick={navigateToPreviousMonth}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
          }}
        >
          <svg
            width='1.5rem'
            height='1.5rem'
            viewBox='0 0 24 24'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path d='M15 5L8 12L15 19' stroke='black' strokeWidth='2' strokeLinejoin='round' />
          </svg>
        </button>
        <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
          {currentMonth.format('YYYY년 M월')}
        </div>
        <button
          onClick={navigateToNextMonth}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
          }}
        >
          <svg
            width='1.5rem'
            height='1.5rem'
            viewBox='0 0 24 24'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path d='M9 5L16 12L9 19' stroke='black' strokeWidth='2' strokeLinejoin='round' />
          </svg>
        </button>
      </div>

      <div
        style={{
          height: '100%',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            textAlign: 'center',
            fontWeight: 'bold',
            marginBottom: '5px',
          }}
        >
          {weekdays.map((day, index) => (
            <div
              key={index}
              style={{
                padding: '5px',
                color: index === 0 ? '#FF5252' : index === 6 ? '#2196F3' : 'inherit',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gridTemplateRows: 'repeat(6, 40px)',
            gap: '2px',
            height: '240px', // 6줄 × 40px = 240px
          }}
        >
          {calendarDays.map((day, index) => {
            const isStart = isSelectedStart(day);
            const isEnd = isSelectedEnd(day);
            const isSelected = isStart || isEnd;
            const isRange = isInRange(day);

            return (
              <div
                key={index}
                onClick={() => handleDateClick(day)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    backgroundColor: isSelected
                      ? 'black'
                      : isRange
                        ? 'rgb(238, 238, 238)'
                        : 'transparent',
                    color: !isCurrentMonth(day)
                      ? '#BDBDBD'
                      : isSelected
                        ? 'white'
                        : index % 7 === 0
                          ? '#FF5252'
                          : index % 7 === 6
                            ? '#2196F3'
                            : 'inherit',
                    borderRadius: '50%',
                    fontWeight: isToday(day) || isSelected ? 'bold' : 'normal',
                  }}
                >
                  {day.date()}
                </div>
                {isToday(day) && !isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '6px',
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      backgroundColor: '#4A90E2',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DateRangeCalendar;

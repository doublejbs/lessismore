import dayjs from 'dayjs';
import DateRangeCalendar from './DateRangeCalendar';

interface Props {
  startDate: dayjs.Dayjs | null;
  endDate: dayjs.Dayjs | null;
  onStartDateChange: (date: dayjs.Dayjs) => void;
  onEndDateChange: (date: dayjs.Dayjs | null) => void;
}

const BagAddDateView = ({ startDate, endDate, onStartDateChange, onEndDateChange }: Props) => {
  return (
    <div>
      <DateRangeCalendar
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />
    </div>
  );
};

export default BagAddDateView;

import dayjs from 'dayjs';
import { FC } from 'react';

interface Props {
  endDate: dayjs.Dayjs;
  handleEndDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const BagAddEndDateView: FC<Props> = ({ endDate, handleEndDateChange }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      <div
        style={{
          fontWeight: 'bold',
          fontSize: '20px',
        }}
      >
        기간
      </div>
      <input
        type='date'
        value={endDate.format('YYYY-MM-DD')}
        onChange={handleEndDateChange}
        style={{
          borderRadius: '10px',
          backgroundColor: '#EEEEEE',
          border: 'none',
          width: '100%',
        }}
      />
    </div>
  );
};

export default BagAddEndDateView;

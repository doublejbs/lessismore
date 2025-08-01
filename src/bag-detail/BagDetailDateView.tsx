import dayjs from 'dayjs';
import { observer } from 'mobx-react-lite';
import { FC, useState } from 'react';
import DateRangeCalendar from '../bag/component/DateRangeCalendar';
import BagDetail from './model/BagDetail';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailDateView: FC<Props> = ({ bagDetail }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDateClick = () => {
    setStartDate(bagDetail.getStartDate());
    setEndDate(bagDetail.getEndDate());
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!startDate || !endDate) {
      alert('시작일과 종료일을 모두 선택해주세요.');
      return;
    }

    if (startDate.isAfter(endDate)) {
      alert('시작일은 종료일보다 늦을 수 없습니다.');
      return;
    }

    try {
      setIsUpdating(true);
      await bagDetail.updateDates(
        startDate.toISOString(),
        endDate.toISOString()
      );
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to update dates:', error);
      alert('날짜 수정에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setStartDate(null);
    setEndDate(null);
  };

  return (
    <>
      <div
        style={{
          width: '100%',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: '#9B9B9B',
          paddingBottom: '0.5rem',
          cursor: 'pointer',
          padding: '0.25rem',
          borderRadius: '0.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          transition: 'background-color 0.2s ease',
        }}
        onClick={handleDateClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f5f5f5';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span>{bagDetail.getDate()}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ opacity: 0.5 }}
        >
          <path
            d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="m18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            width: '100%',
            height: '100%',
            zIndex: 50,
          }}
          onClick={handleCancel}
        >
          <div
            style={{
              width: '100%',
              position: 'fixed',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'white',
              bottom: '0',
              borderRadius: '16px 16px 0 0',
              padding: '24px',
              lineHeight: 1.4,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                marginBottom: '8px',
                textAlign: 'center',
              }}
            >
              여행 날짜 수정
            </div>
            <div
              style={{
                fontSize: '14px',
                color: '#666',
                textAlign: 'center',
                marginBottom: '20px',
              }}
            >
              여행 시작일과 종료일을 선택해주세요
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <DateRangeCalendar
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                initialMonth={bagDetail.getStartDate()}
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: '8px',
              }}
            >
              <button
                onClick={handleCancel}
                disabled={isUpdating}
                style={{
                  flex: 1,
                  backgroundColor: 'white',
                  color: '#666',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  border: '1px solid #ddd',
                  opacity: isUpdating ? 0.6 : 1,
                }}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={isUpdating || !startDate || !endDate}
                style={{
                  flex: 1,
                  backgroundColor: isUpdating || !startDate || !endDate ? '#666' : 'black',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: isUpdating || !startDate || !endDate ? 'not-allowed' : 'pointer',
                  border: 'none',
                }}
              >
                {isUpdating ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default observer(BagDetailDateView); 
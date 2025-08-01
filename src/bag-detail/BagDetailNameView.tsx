import { observer } from 'mobx-react-lite';
import { FC, useState } from 'react';
import BagDetail from './model/BagDetail';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailNameView: FC<Props> = ({ bagDetail }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleNameClick = () => {
    setInputValue(bagDetail.getName());
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (inputValue.trim() === '' || inputValue === bagDetail.getName()) {
      setIsModalOpen(false);
      return;
    }

    try {
      setIsUpdating(true);
      await bagDetail.updateName(inputValue.trim());
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to update name:', error);
      alert('이름 수정에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setInputValue('');
  };

  return (
    <>
      <div
        style={{
          width: '100%',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '1.25rem',
          lineHeight: '1.5rem',
          cursor: 'pointer',
          padding: '0.25rem',
          borderRadius: '0.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          transition: 'background-color 0.2s ease',
        }}
        onClick={handleNameClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f5f5f5';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span>{bagDetail.getName()}</span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ opacity: 0.6 }}
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
              배낭 이름 수정
            </div>
            <div
              style={{
                fontSize: '14px',
                color: '#666',
                textAlign: 'center',
                marginBottom: '20px',
              }}
            >
              새로운 배낭 이름을 입력해주세요
            </div>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="배낭 이름을 입력하세요"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                marginBottom: '20px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                }
              }}
              autoFocus
            />
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
                disabled={isUpdating || inputValue.trim() === ''}
                style={{
                  flex: 1,
                  backgroundColor: isUpdating || inputValue.trim() === '' ? '#666' : 'black',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: isUpdating || inputValue.trim() === '' ? 'not-allowed' : 'pointer',
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

export default observer(BagDetailNameView); 
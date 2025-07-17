import { FC } from 'react';

interface Props {
  bagId: string;
  bagName: string;
}

const ShareButtonView: FC<Props> = ({ bagId, bagName }) => {
  const handleShare = async () => {
    const url = `${window.location.origin}/bag/${bagId}`;

    try {
      await navigator.clipboard.writeText(url);
      alert('링크가 클립보드에 복사되었습니다.');
    } catch (error) {
      console.error('공유 실패:', error);
      alert('공유에 실패했습니다.');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        position: 'absolute',
        right: '1rem',
        top: '0.5rem',
        cursor: 'pointer',
      }}
      onClick={handleShare}
    >
      <svg
        width='1.5rem'
        height='1.5rem'
        viewBox='0 0 24 24'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path
          d='M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 5.30014 15.0353 5.59057 15.1014 5.86572L8.86572 9.1014C8.59057 9.0353 8.30014 9 8 9C6.34315 9 5 10.3431 5 12C5 13.6569 6.34315 15 8 15C8.30014 15 8.59057 14.9647 8.86572 14.8986L15.1014 18.1343C15.0353 18.4094 15 18.6999 15 19C15 20.6569 16.3431 22 18 22C19.6569 22 21 20.6569 21 19C21 17.3431 19.6569 16 18 16C17.6999 16 17.4094 16.0353 17.1343 16.1014L10.8986 12.8657C10.9647 12.5906 11 12.3001 11 12C11 11.6999 10.9647 11.4094 10.8986 11.1343L17.1343 7.8986C17.4094 7.9647 17.6999 8 18 8Z'
          stroke='black'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </div>
  );
};

export default ShareButtonView;

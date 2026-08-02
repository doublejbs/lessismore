import { FC, useEffect, useState } from 'react';

interface DigitProps {
  digit: string;
  direction: 'up' | 'down';
}

const getArray = () => {
  const array = [];

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 10; j++) {
      array.push(j);
    }
  }
  return array;
};

// [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
// 를 놓고 중간 위치에서 왼쪽으로 갈지 오른쪽으로 갈지 판단한다.

export const Digit: FC<DigitProps> = ({ digit, direction }) => {
  const [currentIndex, setCurrentIndex] = useState(parseInt(digit) + 10);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (currentIndex === parseInt(digit) + 10) {
      return;
    } else {
      setIsAnimating(true);
      const digitNum = parseInt(digit);

      if (direction === 'up') {
        if (digitNum > currentIndex % 10) {
          setCurrentIndex(getMiddleIndex(digitNum));
        } else {
          setCurrentIndex(getNextIndex(digitNum));
        }
      } else {
        if (digitNum < currentIndex % 10) {
          setCurrentIndex(getMiddleIndex(digitNum));
        } else {
          setCurrentIndex(getPreviousIndex(digitNum));
        }
      }
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setCurrentIndex(getMiddleIndex(digitNum));
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [digit, direction]);

  const getMiddleIndex = (number: number) => {
    return (number % 10) + 10;
  };

  const getNextIndex = (number: number) => {
    return (number % 10) + 20;
  };

  const getPreviousIndex = (number: number) => {
    return number;
  };

  return (
    <div
      style={{
        display: 'inline-block',
        position: 'relative',
        height: '48px',
        overflow: 'hidden',
        width: '25px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: `-${currentIndex * 48}px`,
          transition: isAnimating ? 'top 0.5s ease-in-out' : 'none',
        }}
      >
        {getArray().map((num, i) => (
          <div
            key={i}
            style={{
              height: '48px',
              lineHeight: '48px',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '40px',
            }}
          >
            {num}
          </div>
        ))}
      </div>
    </div>
  );
};

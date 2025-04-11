import { FC, useEffect, useState } from 'react';

interface DigitProps {
  digit: string;
}

export const Digit: FC<DigitProps> = ({ digit }) => {
  const [currentDigit, setCurrentDigit] = useState('0');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (currentDigit !== digit) {
      setIsAnimating(true);
      setCurrentDigit(digit);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [digit, currentDigit]);

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
          top: `-${parseInt(currentDigit) * 48}px`,
          transition: isAnimating ? 'top 0.5s ease-in-out' : 'none',
        }}
      >
        {[...Array(10)].map((_, i) => (
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
            {i}
          </div>
        ))}
      </div>
    </div>
  );
};

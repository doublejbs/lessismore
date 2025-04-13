import { FC, useEffect, useState, useRef } from 'react';
import { Digit } from './Digit';
import { DecimalPoint } from './DecimalPoint';

interface FlipCounterProps {
  value: number;
}

export const FlipCounter: FC<FlipCounterProps> = ({ value }) => {
  const [integerPart, setIntegerPart] = useState('');
  const [decimalParts, setDecimalParts] = useState<string[]>([]);
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value > prevValueRef.current) {
      setDirection('up');
    } else if (value < prevValueRef.current) {
      setDirection('down');
    }
    prevValueRef.current = value;

    const str = value.toString();
    const parts = str.split('.');
    const newIntegerPart = parts[0].replace(/^0+/, '') || '0';
    const newDecimalPart = parts[1] || '';

    setIntegerPart(newIntegerPart);
    setDecimalParts(newDecimalPart.split(''));
  }, [value]);

  return (
    <div
      style={{
        width: '100%',
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0px',
      }}
    >
      {integerPart.split('').map((digit, index) => (
        <Digit key={`int-${index}`} digit={digit} direction={direction} />
      ))}
      {decimalParts.length > 0 && (
        <>
          <DecimalPoint />
          {decimalParts.map((digit, index) => (
            <Digit key={`dec-${index}`} digit={digit} direction={direction} />
          ))}
        </>
      )}
      <span style={{ fontWeight: 'bold', fontSize: '40px', marginLeft: '8px' }}>kg</span>
    </div>
  );
};

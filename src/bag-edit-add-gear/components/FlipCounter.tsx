import { FC, useEffect, useState } from 'react';
import { Digit } from './Digit';
import { DecimalPoint } from './DecimalPoint';

interface FlipCounterProps {
  value: number;
}

export const FlipCounter: FC<FlipCounterProps> = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const formatWeight = (weight: number) => {
    const str = weight.toString();
    const parts = str.split('.');
    const integerPart = parts[0].replace(/^0+/, '') || '0';
    const decimalPart = parts[1] || '';

    return {
      integer: integerPart,
      decimal: decimalPart,
    };
  };

  const { integer, decimal } = formatWeight(displayValue);

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
      {integer.split('').map((digit, index) => (
        <Digit key={`int-${index}`} digit={digit} />
      ))}
      {decimal && (
        <>
          <DecimalPoint />
          {decimal.split('').map((digit, index) => (
            <Digit key={`dec-${index}`} digit={digit} />
          ))}
        </>
      )}
      <span style={{ fontWeight: 'bold', fontSize: '40px', marginLeft: '8px' }}>kg</span>
    </div>
  );
};

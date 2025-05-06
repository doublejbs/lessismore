import React, { useRef, useEffect } from 'react';
import { Input } from 'antd';

interface Props {
  value: string;
  onChange: (value: string) => void;
  editing: boolean;
}

const WeightCell: React.FC<Props> = ({ value, onChange, editing }) => {
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (!editing) return <>{value}</>;
  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size='small'
      style={{ width: 80, height: 32, fontSize: 15, padding: '0 8px' }}
    />
  );
};

export default WeightCell;

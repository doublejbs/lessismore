import React, { useState } from 'react';
import { Input, Button, Space } from 'antd';

interface EditCompanyCellProps {
  initialValue: string;
  loading: boolean;
  onSave: (newValue: string) => void;
  onCancel: () => void;
}

const EditCompanyCell: React.FC<EditCompanyCellProps> = ({
  initialValue,
  loading,
  onSave,
  onCancel,
}) => {
  const [editValue, setEditValue] = useState(initialValue);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const handleSave = () => {
    onSave(editValue);
  };

  return (
    <Space size={8} align='center'>
      <Input
        value={editValue}
        onChange={handleChange}
        style={{ width: 120 }}
        size='small'
        autoFocus
        onPressEnter={handleSave}
      />
      <Button type='primary' size='small' loading={loading} onClick={handleSave}>
        저장
      </Button>
      <Button size='small' onClick={onCancel}>
        취소
      </Button>
    </Space>
  );
};

export default EditCompanyCell;

import React, { useState } from 'react';
import { Input, Button, Space } from 'antd';

interface EditNameCellProps {
  initialValue: string;
  loading: boolean;
  onSave: (newName: string) => void;
  onCancel: () => void;
}

const EditNameCell: React.FC<EditNameCellProps> = ({ initialValue, loading, onSave, onCancel }) => {
  const [editName, setEditName] = useState(initialValue);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditName(e.target.value);
  };

  const handleSave = () => {
    onSave(editName);
  };

  return (
    <Space size={8} align='center'>
      <Input
        value={editName}
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

export default EditNameCell;

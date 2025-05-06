import React, { useState } from 'react';
import { Button, Space, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import EditSubCategoryCell from '../EditSubCategoryCell';
import Manage from '../model/Manage';

interface RowType {
  id: string;
  name: string;
  company: string;
  weight: string;
  category: string;
  subCategory: string;
  createDate: number;
}

export function useSubCategoryColumn(manage: Manage): ColumnsType<RowType>[number] {
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEdit = (id: string) => {
    setEditId(id);
  };

  const handleEditSubmit = async (id: string, newValue: string) => {
    setLoading(true);
    try {
      await manage.updateSubCategory(id, newValue);
      setEditId(null);
      message.success('서브카테고리가 수정되었습니다.');
    } catch (e) {
      message.error('수정에 실패했습니다.');
    }
    setLoading(false);
  };

  const handleEditCancel = () => {
    setEditId(null);
  };

  return {
    title: '서브카테고리',
    dataIndex: 'subCategory',
    key: 'subCategory',
    render: (text, record) =>
      editId === record.id ? (
        <EditSubCategoryCell
          initialValue={record.subCategory}
          loading={loading}
          onSave={(newValue) => handleEditSubmit(record.id, newValue)}
          onCancel={handleEditCancel}
        />
      ) : (
        <Space size={8} align='center'>
          {text}
          <Button size='small' onClick={() => handleEdit(record.id)} style={{ padding: '0 10px' }}>
            수정
          </Button>
        </Space>
      ),
  };
}

import React, { useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
import Manage from '../model/Manage';
import FirebaseImageStorage from '../../firebase/FirebaseImageStorage';

interface AddGearModalProps {
  open: boolean;
  onClose: () => void;
  manager: Manage;
}

const AddGearModal: React.FC<AddGearModalProps> = ({ open, onClose, manager }) => {
  const [form] = Form.useForm();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleAdd = async () => {
    try {
      setUploading(true);
      const values = await form.validateFields();
      let imageUrl = values.imageUrl || '';
      if (file) {
        const safe = (v: string = '') => v.replace(/[^a-zA-Z0-9가-힣]/g, '_');
        const fileName = `${safe(values.company)}_${safe(values.name)}_${safe(values.category)}_${Date.now()}${file.name.substring(file.name.lastIndexOf('.'))}`;
        const storage = FirebaseImageStorage.new();
        imageUrl = await storage.uploadFileToPublic(file, fileName);
      }
      await manager.addGear({ ...values, imageUrl });
      onClose();
      form.resetFields();
      setFile(null);
      setPreviewUrl(null);
      message.success('장비가 추가되었습니다.');
    } catch (e) {
      console.error(e);
      // validation 실패
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(f);
    } else {
      setFile(null);
      setPreviewUrl(null);
    }
  };

  return (
    <Modal
      title='장비 추가'
      open={open}
      onCancel={onClose}
      onOk={handleAdd}
      okText='추가'
      cancelText='취소'
      confirmLoading={uploading}
    >
      <Form form={form} layout='vertical'>
        <Form.Item
          name='name'
          label='이름'
          rules={[{ required: true, message: '이름을 입력하세요.' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name='company'
          label='회사'
          rules={[{ required: true, message: '회사를 입력하세요.' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name='companyKorean'
          label='회사(한글)'
          rules={[{ required: true, message: '회사(한글)을 입력하세요.' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label='이미지 파일'>
          <input type='file' accept='image/*' onChange={handleFileChange} />
          {file && <div style={{ marginTop: 8, fontSize: 13 }}>선택된 파일: {file.name}</div>}
          {previewUrl && (
            <div style={{ marginTop: 8 }}>
              <img
                src={previewUrl}
                alt='미리보기'
                style={{
                  width: 80,
                  height: 80,
                  objectFit: 'contain',
                  border: '1px solid #eee',
                  borderRadius: 6,
                }}
              />
            </div>
          )}
        </Form.Item>
        <Form.Item
          name='weight'
          label='무게'
          rules={[{ type: 'number', message: '무게는 숫자여야 합니다.' }]}
          initialValue={0}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name='category'
          label='카테고리'
          rules={[{ required: true, message: '카테고리를 입력하세요.' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name='color' label='색상' initialValue=''>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddGearModal;

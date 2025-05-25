import React from 'react';
import { Button, message } from 'antd';
import Manage from './model/Manage';

interface UploadButtonProps {
  imageUrl: string;
  name: string;
  id: string;
  manage: Manage;
}

const UploadButton: React.FC<UploadButtonProps> = ({ imageUrl, name, id, manage }) => {
  const handleUpload = async () => {
    try {
      const downloadUrl = await manage.uploadAndUpdateImageUrl(id, imageUrl, name);
      if (downloadUrl) {
        message.success('업로드 및 이미지 URL 업데이트 성공!');
      } else {
        message.success('업로드 성공!');
      }
    } catch (error) {
      message.error('업로드에 실패했습니다.');
    }
  };

  return (
    <Button type="primary" onClick={handleUpload}>업로드</Button>
  );
};

export default UploadButton; 
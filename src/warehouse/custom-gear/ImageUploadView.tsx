import React, { FC, useState } from 'react';
import CustomGear from './CustomGear.ts';

interface Props {
  customGear: CustomGear;
}

const ImageUploadView: FC<Props> = ({ customGear }) => {
  const [previewSrc, setPreviewSrc] = useState('');

  const handlePreview = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setPreviewSrc(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // 파일 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      customGear.setFile(file);
      handlePreview(file);
    }
  };

  return (
    <div>
      {/* 파일 첨부 */}
      <label
        htmlFor="fileInput"
        style={{
          padding: '10px 20px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer',
          backgroundColor: '#f9f9f9',
          marginBottom: '10px',
          height: '100px',
        }}
      >
        📷
      </label>
      <input
        type="file"
        id="fileInput"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {previewSrc && (
        <img
          src={previewSrc}
          alt="이미지 미리보기"
          style={{
            width: '100%',
            maxHeight: '200px',
            marginTop: '10px',
            objectFit: 'cover',
          }}
        />
      )}
    </div>
  );
};

export default ImageUploadView;

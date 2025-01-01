import React, { FC, useState } from 'react';

const ImageUploadView: FC = () => {
  const [previewSrc, setPreviewSrc] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
      setSelectedFile(file);
      handlePreview(file);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto' }}>
      {/* 파일 첨부 */}
      <label
        htmlFor="fileInput"
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer',
          backgroundColor: '#f9f9f9',
          marginBottom: '10px',
        }}
      >
        파일 첨부
      </label>
      <input
        type="file"
        id="fileInput"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* 모바일 카메라 촬영 */}
      <label
        htmlFor="fileCapture"
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer',
          backgroundColor: '#f9f9f9',
          marginBottom: '10px',
        }}
      >
        사진 촬영
      </label>
      <input
        type="file"
        id="fileCapture"
        accept="image/*"
        capture="environment"
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

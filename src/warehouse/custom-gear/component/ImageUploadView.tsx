import React, { FC } from 'react';
import FileUpload from '../../model/FileUpload';
import { observer } from 'mobx-react-lite';

interface Props {
  fileUpload: FileUpload;
}

const ImageUploadView: FC<Props> = ({ fileUpload }) => {
  const previewSrc = fileUpload.getPreviewSrc();

  const handlePreview = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        fileUpload.setPreviewSrc(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // 파일 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      fileUpload.setFile(file);
      handlePreview(file);
    }
  };

  const handleDeletePreview = () => {
    fileUpload.setPreviewSrc('');
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        gap: '8px',
      }}
    >
      <div>
        <label
          htmlFor="fileInput"
          style={{
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            backgroundColor: '#f9f9f9',
            height: '80px',
            width: '60px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
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
      </div>
      {previewSrc && (
        <div
          style={{
            width: '60px',
            height: '80px',
            objectFit: 'cover',
            position: 'relative',
          }}
        >
          <button
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              border: '1px solid black',
              borderRadius: '50%',
              backgroundColor: 'black',
              color: 'white',
              width: '16px',
              height: '16px',
              fontSize: '10px',
            }}
            onClick={handleDeletePreview}
          >
            X
          </button>
          <img
            src={previewSrc}
            alt="이미지 미리보기"
            style={{
              width: '60px',
              height: '80px',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default observer(ImageUploadView);

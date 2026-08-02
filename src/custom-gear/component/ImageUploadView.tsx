import React, { FC } from 'react';
import FileUpload from '../../warehouse/model/FileUpload';
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
            border: '1px solid #E7E7E7',
            borderRadius: '4px',
            cursor: 'pointer',
            height: '80px',
            width: '80px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <svg
            width="25"
            height="24"
            viewBox="0 0 25 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7.80976 6.12023V7.12023C8.16543 7.12023 8.49433 6.93132 8.67354 6.62411L7.80976 6.12023ZM9.48976 3.24023V2.24023C9.1341 2.24023 8.8052 2.42915 8.62599 2.73636L9.48976 3.24023ZM15.7298 3.24023L16.5935 2.73636C16.4143 2.42915 16.0854 2.24023 15.7298 2.24023V3.24023ZM17.4098 6.12023L16.546 6.62411C16.7252 6.93132 17.0541 7.12023 17.4098 7.12023V6.12023ZM4.00977 18.3602V8.52023H2.00977V18.3602H4.00977ZM5.40977 7.12023H7.80976V5.12023H5.40977V7.12023ZM8.67354 6.62411L10.3535 3.74411L8.62599 2.73636L6.94599 5.61636L8.67354 6.62411ZM9.48976 4.24023H15.7298V2.24023H9.48976V4.24023ZM14.866 3.74411L16.546 6.62411L18.2735 5.61636L16.5935 2.73636L14.866 3.74411ZM17.4098 7.12023H19.8098V5.12023H17.4098V7.12023ZM21.2098 8.52023V18.3602H23.2098V8.52023H21.2098ZM21.2098 18.3602C21.2098 19.1334 20.583 19.7602 19.8098 19.7602V21.7602C21.6875 21.7602 23.2098 20.238 23.2098 18.3602H21.2098ZM19.8098 7.12023C20.583 7.12023 21.2098 7.74704 21.2098 8.52023H23.2098C23.2098 6.64247 21.6875 5.12023 19.8098 5.12023V7.12023ZM4.00977 8.52023C4.00977 7.74703 4.63657 7.12023 5.40977 7.12023V5.12023C3.532 5.12023 2.00977 6.64246 2.00977 8.52023H4.00977ZM5.40977 19.7602C4.63657 19.7602 4.00977 19.1334 4.00977 18.3602H2.00977C2.00977 20.238 3.532 21.7602 5.40977 21.7602V19.7602ZM15.2098 12.8402C15.2098 14.2762 14.0457 15.4402 12.6098 15.4402V17.4402C15.1503 17.4402 17.2098 15.3807 17.2098 12.8402H15.2098ZM12.6098 15.4402C11.1738 15.4402 10.0098 14.2762 10.0098 12.8402H8.00976C8.00976 15.3807 10.0693 17.4402 12.6098 17.4402V15.4402ZM10.0098 12.8402C10.0098 11.4043 11.1738 10.2402 12.6098 10.2402V8.24023C10.0693 8.24023 8.00976 10.2997 8.00976 12.8402H10.0098ZM12.6098 10.2402C14.0457 10.2402 15.2098 11.4043 15.2098 12.8402H17.2098C17.2098 10.2997 15.1503 8.24023 12.6098 8.24023V10.2402ZM19.8098 19.7602H5.40977V21.7602H19.8098V19.7602Z"
              fill="black"
            />
          </svg>
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
            width: '80px',
            height: '80px',
            objectFit: 'cover',
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            backgroundColor: '#F6F6F6',
            borderRadius: '4px',
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
              height: '80px',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default observer(ImageUploadView);

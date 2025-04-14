import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import app from './App';
import Gear from './model/Gear';
import FirebaseImageStorage from './firebase/FirebaseImageStorage';

// URL에서 이미지를 다운로드하여 File 객체로 변환하는 함수
const urlToFile = async (url: string, fileName: string): Promise<File | null> => {
  try {
    // Cloudflare Workers 프록시 서버를 통해 이미지 다운로드
    const proxyUrl = 'https://image-proxy.doublejbs.workers.dev/proxy?url=';
    const response = await fetch(`${proxyUrl}${url}`, {
      headers: {
        Accept: 'image/*',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type });
  } catch (error) {
    console.error('Error downloading image:', error);
    return null;
  }
};

const AdminView = () => {
  const [file, setFile] = useState<null | File>(null);
  const [imageStorage] = useState<FirebaseImageStorage | null>(() => FirebaseImageStorage.new());

  // 파일 선택 시 상태 업데이트
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  // 엑셀 파일 파싱 후 Firestore에 업로드
  const handleFileUpload = async () => {
    if (!file) {
      alert('엑셀 파일을 선택해주세요.');
      return;
    }

    const reader = new FileReader();

    reader.onload = async () => {
      const data = reader.result;
      const workbook = XLSX.read(data, { type: 'binary' });

      // 첫 번째 시트 데이터 가져오기
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // 시트 데이터를 JSON 형태로 변환
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      for (let i = 0; i < jsonData.length; i++) {
        const item: any = jsonData[i];
        try {
          console.log(item);
          // imageUrl이 있는 경우 이미지 다운로드
          let imageFile = null;
          if (item.imageUrl) {
            imageFile = await urlToFile(
              item.imageUrl,
              `${item.company}-${item.name}-${item.color}.jpg`
            );
          }

          await app.getGearStore().add(
            new Gear(
              '',
              item.name,
              item.company,
              item.weight,
              // imageFile
              //   ? ((await imageStorage?.uploadFileToPublic(
              //       imageFile,
              //       `${item.company}-${item.name}-${item.color}.jpg`
              //     )) ?? '')
              //   : '',
              item.imageUrl,
              false,
              false,
              item.category,
              item.subCategory,
              [],
              [],
              [],
              Date.now(),
              item.color ?? '',
              item.companyKorean
            )
          );
        } catch (error) {
          console.error(`Error processing item ${item.name}:`, error);
        }
      }

      alert('데이터가 Firestore에 업로드되었습니다.');
    };

    // 엑셀 파일을 읽기
    reader.readAsBinaryString(file);
  };

  return (
    <div>
      <h2>엑셀 파일 업로드</h2>
      <input type='file' accept='.xlsx, .xls' onChange={handleFileChange} />
      <button onClick={handleFileUpload}>업로드</button>
    </div>
  );
};

export default AdminView;

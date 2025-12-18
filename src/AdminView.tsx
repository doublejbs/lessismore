import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import app from './App';
import FirebaseImageStorage from './firebase/FirebaseImageStorage';
import Gear from './model/Gear';

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
  const firebase = app.getFirebase();
  const isLoggedIn = firebase.isLoggedIn();

  // 파일 선택 시 상태 업데이트
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleClickGoogle = async () => {
    await firebase.logInWithGoogle();
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

  if (!isLoggedIn) {
    return (
      <div
        style={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'black',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background 0.3s',
          }}
          onClick={handleClickGoogle}
        >
          <svg
            style={{
              width: '24px',
              height: '24px',
              marginRight: '10px',
            }}
            viewBox='0 0 24 24'
          >
            <path
              fill='#4285F4'
              d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
            />
            <path
              fill='#34A853'
              d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
            />
            <path
              fill='#FBBC05'
              d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
            />
            <path
              fill='#EA4335'
              d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
            />
          </svg>
          <span>Google로 로그인</span>
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2>엑셀 파일 업로드</h2>
      <input type='file' accept='.xlsx, .xls' onChange={handleFileChange} />
      <button onClick={handleFileUpload}>업로드</button>
    </div>
  );
};

export default observer(AdminView);

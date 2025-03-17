import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import app from './App';
import Gear from './model/Gear';

const AdminView = () => {
  const [file, setFile] = useState<null | File>(null);

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
        await app
          .getGearStore()
          .add(
            new Gear(
              '',
              item.name,
              item.company,
              item.weight,
              item.imageUrl,
              true,
              false,
              item.category,
              item.subCategory,
              [],
              []
            )
          );
      }

      // Firestore에 데이터 업로드

      alert('데이터가 Firestore에 업로드되었습니다.');
    };

    // 엑셀 파일을 읽기
    reader.readAsBinaryString(file);
  };

  return (
    <div>
      <h2>엑셀 파일 업로드</h2>
      <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
      <button onClick={handleFileUpload}>업로드</button>
    </div>
  );
};

export default AdminView;

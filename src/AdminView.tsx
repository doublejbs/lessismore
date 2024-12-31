import App from './App.ts';
import { addDoc, collection } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import React, { useState } from 'react';

const AdminView = () => {
  // 엑셀 파일 읽기 및 JSON 변환
  const [data, setData] = useState<any>([]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as any);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: Iterable<{
        name: string;
        weight: number;
        company: string;
      }> = XLSX.utils.sheet_to_json(sheet);
      setData(jsonData);
      const db = App.getStore();

      // Firestore에 추가
      for (const row of jsonData) {
        const docRef = await addDoc(collection(db, 'gear'), {
          name: row.name,
          weight: row.weight,
          company: row.company,
          imageUrl: '',
        });

        console.log(`Added document with ID: ${docRef.id}`);
      }

      alert('Data uploaded to Firestore!');
    };

    reader.readAsArrayBuffer(file);
  };

  // Firestore에 데이터 추가

  return (
    <div>
      <h1>Admin View</h1>
      <h1>Upload Excel to Firestore</h1>
      <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
      <div>
        <h2>Data Preview:</h2>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  );
};

export default AdminView;

import React, { useRef, useState } from 'react';
import { Modal, Table, Spin, Alert, Button, message } from 'antd';
import * as XLSX from 'xlsx';
import Manage from '../model/Manage';
import FirebaseImageStorage from '../../firebase/FirebaseImageStorage';
import { v4 as uuidv4 } from 'uuid';

// 카테고리 한글→영어 매핑
const categoryMap: Record<string, string> = {
  텐트: 'tent',
  침낭: 'sleeping_bag',
  배낭: 'backpack',
  의류: 'clothing',
  매트: 'mat',
  가구: 'furniture',
  조명: 'lantern',
  조리: 'cooking',
  기타: 'etc',
};

const AddGearExcelModal: React.FC<{ open: boolean; onClose: () => void; manager: Manage }> = ({
  open,
  onClose,
  manager,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registeringIndex, setRegisteringIndex] = useState<number | null>(null);
  const imgRefs = useRef<{ [key: number]: HTMLImageElement | null }>({});

  // 전체 이미지 다운로드 (다운로드 기능 제거, 안내 메시지만 표시)
  const handleDownloadAllImages = () => {
    message.info('이미지 다운로드 기능은 제공하지 않습니다. imageUrl 그대로 등록됩니다.');
  };

  // 수동 이미지 업로드
  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newRows: any[] = [];
    for (let i = 0; i < files.length; ++i) {
      const file = files[i];
      // 파일명에서 회사_이름_색상 추출
      const [company, name, color] = file.name.replace(/\.[^/.]+$/, '').split('_');
      newRows.push({
        company: company || '',
        name: name || '',
        color: color || '',
        imageFile: file,
        imageUrl: '', // 업로드 후 채울 예정
      });
    }
    setData((prev) => [...prev, ...newRows]);
  };

  const handleExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        if (!wsname) throw new Error('엑셀 파일에 시트가 없습니다.');
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (!jsonData.length) throw new Error('엑셀 데이터가 비어있거나 올바르지 않습니다.');

        // 카테고리 변환 적용
        const convertedData = (jsonData as any[]).map((row) => ({
          ...row,
          category: categoryMap[row.category] || 'etc',
        }));
        setData(convertedData);
        const keys = Object.keys(jsonData[0] as any);
        const cols = keys.map((key) => ({
          title: key,
          dataIndex: key,
          key,
          render: undefined as any,
        }));

        if (keys.includes('imageUrl')) {
          cols.unshift({
            title: '이미지',
            dataIndex: 'imageUrl',
            key: 'thumbnail',
            render: ((url: string, row: any, i: number) => {
              if (row.imageFile) {
                // 업로드된 파일 미리보기
                return (
                  <img
                    src={URL.createObjectURL(row.imageFile)}
                    alt=''
                    style={{
                      width: 40,
                      height: 40,
                      objectFit: 'contain',
                      border: '1px solid #eee',
                      borderRadius: 4,
                    }}
                  />
                );
              }
              return url ? (
                <img
                  src={url}
                  alt=''
                  ref={(el) => {
                    imgRefs.current[i] = el;
                  }}
                  style={{
                    width: 40,
                    height: 40,
                    objectFit: 'contain',
                    border: '1px solid #eee',
                    borderRadius: 4,
                  }}
                />
              ) : (
                '-'
              );
            }) as any,
            width: 60,
          } as any);
        }
        setColumns(cols);
        setError(null);
      } catch (err: any) {
        setData([]);
        setColumns([]);
        setError(err?.message || '엑셀 파일을 읽는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // 이미지 데이터를 canvas로 추출
  const getImageBlobFromImg = (img: HTMLImageElement): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('canvas context 생성 실패');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject('이미지 변환 실패');
        }, 'image/jpeg');
      } catch (e) {
        reject(e);
      }
    });
  };

  const handleRegister = async () => {
    setRegistering(true);
    setRegisteringIndex(0);
    try {
      const failedRows: number[] = [];
      const batchSize = 6;
      for (let batchStart = 0; batchStart < data.length; batchStart += batchSize) {
        const batch = data.slice(batchStart, batchStart + batchSize);
        setRegisteringIndex(Math.min(batchStart + batch.length, data.length));
        await Promise.all(
          batch.map(async (row, idx) => {
            try {
              let imageUrl = row.imageUrl;
              if (row.imageFile) {
                // 수동 업로드 파일만 Storage 업로드
                const safe = (v: string = '') => v.replace(/[^a-zA-Z0-9가-힣]/g, '_');
                const ext = row.imageFile.name.includes('.')
                  ? row.imageFile.name.substring(row.imageFile.name.lastIndexOf('.'))
                  : '.jpg';
                const fileName = `${uuidv4()}${ext}`;
                const storage = FirebaseImageStorage.new();
                imageUrl = await storage.uploadFileToPublic(row.imageFile, uuidv4());
              }
              // imageUrl이 외부 URL이어도 그대로 등록
              // const newImageUrl = await manager.uploadImageUrl(imageUrl, uuidv4());
              let newImageUrl = '';
              if (imageUrl) {
                newImageUrl = await manager.uploadImageUrl(imageUrl, uuidv4());
              }

              const category = row.category || '';

              await manager.addGearOnly({ ...row, imageUrl: newImageUrl });
            } catch (rowErr: any) {
              failedRows.push(batchStart + idx + 1); // 1-based index
            }
          })
        );
      }
      if (failedRows.length > 0) {
        message.warning(
          `일부 행 등록 실패: ${failedRows.join(', ')}행. 나머지는 정상 등록되었습니다.`
        );
      } else {
        message.success('엑셀 데이터가 모두 등록되었습니다.');
      }
      onClose();
    } catch (e: any) {
      message.error('등록 중 오류: ' + (e?.message || String(e)));
    } finally {
      setRegistering(false);
      setRegisteringIndex(null);
    }
  };

  return (
    <Modal title='엑셀로 장비 추가' open={open} onCancel={onClose} footer={null} width={900}>
      <div style={{ marginBottom: 16 }}>
        <input
          type='file'
          accept='.xlsx,.xls'
          onChange={handleExcelChange}
          style={{ marginLeft: 16 }}
        />
        {fileName && <span style={{ marginLeft: 12, fontSize: 13 }}>{fileName}</span>}
      </div>
      <Spin
        spinning={loading || registering}
        tip={
          registering
            ? `장비를 등록 중입니다... (${registeringIndex ?? 0}/${data.length})`
            : '엑셀 파일을 불러오는 중입니다...'
        }
      >
        {error ? (
          <Alert type='error' message={error} showIcon style={{ margin: '40px 0' }} />
        ) : (
          <>
            <Table
              columns={columns}
              dataSource={data.map((row, i) => ({ ...row, key: i }))}
              pagination={false}
              bordered
              size='small'
              scroll={{ x: 800, y: 400 }}
              locale={{ emptyText: '엑셀 파일을 첨부하세요.' }}
            />
            {data.length > 0 && (
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Button type='primary' onClick={handleRegister} loading={registering}>
                  확인
                </Button>
              </div>
            )}
          </>
        )}
      </Spin>
    </Modal>
  );
};

export default AddGearExcelModal;

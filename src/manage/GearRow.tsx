import React, { useState } from 'react';
import { Button, Space, Input, Checkbox, message } from 'antd';
import NameCell from './columns/NameCell';
import CompanyCell from './columns/CompanyCell';
import CompanyKoreanCell from './columns/CompanyKoreanCell';
import WeightCell from './columns/WeightCell';
import CategoryCell from './columns/CategoryCell';
import FirebaseImageStorage from '../firebase/FirebaseImageStorage';
import Manage from './model/Manage';
import UploadButton from './UploadButton';

interface GearRowProps {
  gear: {
    id: string;
    name: string;
    company: string;
    companyKorean: string;
    weight: string;
    category: string;
    secondaryCategory?: string;
    tertiaryCategory?: string;
    createDate: number;
    imageUrl?: string;
    color?: string;
    nameKorean?: string;
  };
  manage: Manage;
}

const GearRow: React.FC<GearRowProps> = ({ gear, manage }) => {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({ ...gear });
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(f);
    } else {
      setFile(null);
      setPreviewUrl(null);
    }
  };

  const handleEdit = () => {
    setEditing(true);
    setValues({ ...gear });
    setFile(null);
    setPreviewUrl(null);
  };

  const handleCancel = () => {
    setEditing(false);
    setValues({ ...gear });
    setFile(null);
    setPreviewUrl(null);
  };

  const handleSave = async () => {
    setLoading(true);
    const newValues = { ...values };
    if (file) {
      setUploading(true);
      try {
        const safe = (v: string = '') => v.replace(/[^a-zA-Z0-9가-힣]/g, '_');
        const fileName = `${safe(values.company)}_${safe(values.name)}_${safe(values.category)}_${Date.now()}${file ? file.name.substring(file.name.lastIndexOf('.')) : ''}`;
        const storage = FirebaseImageStorage.new();
        const url = await storage.uploadFileToPublic(file, fileName);
        newValues.imageUrl = url;
      } finally {
        setUploading(false);
      }
    }
    await manage.updateGear(gear.id, newValues);
    message.success('저장되었습니다.');
    setLoading(false);
    setEditing(false);
    setFile(null);
    setPreviewUrl(null);
  };

  const handleDelete = async () => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    setLoading(true);
    try {
      await manage.deleteGear(gear.id);
    } catch (e) {
      // 에러 처리 필요시 추가
    }
    setLoading(false);
  };

  return (
    <tr>
      <td>
        <Checkbox
          checked={manage.selectedIds.includes(gear.id)}
          onChange={(e) => manage.selectGear(gear.id, e.target.checked)}
        />
      </td>
      <td>
        <NameCell value={values.name} onChange={(v) => handleChange('name', v)} editing={editing} />
      </td>
      <td>
        <NameCell
          value={values.nameKorean || ''}
          onChange={(v) => handleChange('nameKorean', v)}
          editing={editing}
        />
      </td>
      <td>
        <CompanyCell
          value={values.company}
          onChange={(v) => handleChange('company', v)}
          editing={editing}
        />
      </td>
      <td>
        <CompanyKoreanCell
          value={values.companyKorean}
          onChange={(v) => handleChange('companyKorean', v)}
          editing={editing}
        />
      </td>
      <td>
        {gear.imageUrl ? (
          <img
            src={gear.imageUrl}
            alt='gear'
            style={{
              width: 48,
              height: 48,
              objectFit: 'contain',
              borderRadius: 6,
              border: '1px solid #eee',
              background: '#fafafa',
            }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              background: '#f5f5f5',
              borderRadius: 6,
              border: '1px solid #eee',
            }}
          />
        )}
      </td>
      <td>
        {editing ? (
          <div>
            <Input
              value={values.imageUrl || ''}
              onChange={(e) => handleChange('imageUrl', e.target.value)}
              size='small'
              style={{ width: 180, fontSize: 12, marginBottom: 4 }}
              placeholder='이미지 URL 입력'
            />
            <input
              type='file'
              accept='image/*'
              onChange={handleFileChange}
              style={{ marginTop: 4 }}
            />
            {file && <div style={{ marginTop: 4, fontSize: 12 }}>선택된 파일: {file.name}</div>}
            {(previewUrl || values.imageUrl) && (
              <div style={{ marginTop: 4 }}>
                <img
                  src={previewUrl || values.imageUrl}
                  alt='미리보기'
                  style={{
                    width: 48,
                    height: 48,
                    objectFit: 'contain',
                    border: '1px solid #eee',
                    borderRadius: 6,
                  }}
                />
              </div>
            )}
          </div>
        ) : values.imageUrl ? (
          <a
            href={values.imageUrl}
            target='_blank'
            rel='noopener noreferrer'
            style={{ fontSize: 12, wordBreak: 'break-all' }}
          >
            {values.imageUrl}
          </a>
        ) : (
          '-'
        )}
      </td>
      <td>
        {editing ? (
          <Input
            value={values.color || ''}
            onChange={(e) => handleChange('color', e.target.value)}
            size='small'
            style={{ width: 80, fontSize: 12 }}
            placeholder='색상'
          />
        ) : values.color ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                display: 'inline-block',
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: values.color,
                border: '1px solid #ccc',
              }}
            />
            <span>{values.color}</span>
          </span>
        ) : (
          '-'
        )}
      </td>
      <td>
        <WeightCell
          value={values.weight}
          onChange={(v) => handleChange('weight', v)}
          editing={editing}
        />
      </td>
      <td>
        <CategoryCell
          value={values.category}
          onChange={(v) => handleChange('category', v)}
          editing={editing}
        />
      </td>
      <td>
        <CategoryCell
          value={values.secondaryCategory || ''}
          onChange={(v) => handleChange('secondaryCategory', v)}
          editing={editing}
        />
      </td>
      <td>
        <CategoryCell
          value={values.tertiaryCategory || ''}
          onChange={(v) => handleChange('tertiaryCategory', v)}
          editing={editing}
        />
      </td>
      <td>{gear.createDate ? new Date(gear.createDate).toLocaleDateString() : '-'}</td>
      <td>
        {editing ? (
          <Space>
            <Button type='primary' size='small' loading={loading || uploading} onClick={handleSave}>
              저장
            </Button>
            <Button size='small' onClick={handleCancel}>
              취소
            </Button>
          </Space>
        ) : (
          <Space>
            <Button size='small' onClick={handleEdit}>
              수정
            </Button>
            <Button size='small' danger onClick={handleDelete}>
              삭제
            </Button>
            <UploadButton
              imageUrl={values.imageUrl ?? ''}
              name={values.name}
              id={gear.id}
              manage={manage}
            />
          </Space>
        )}
      </td>
    </tr>
  );
};

export default GearRow;
